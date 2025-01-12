import log from 'electron-log';
import electron from 'electron';
import serialport from 'serialport';
import SG90CarWash from './machine_types/sg90_car_wash.js';
import FL30CarWash from './machine_types/fl30_car_wash.js';
import EventEmitter from 'events';

const { BrowserWindow } = electron;
const { SerialPort } = serialport;

class CarWashManager extends EventEmitter {
  constructor() {
    super();
    this.machine = null; // 단일 머신 저장
    this.lastStatusReceived = null; // 마지막 상태 수신 시간
    this.statusCheckInterval = null;
    this.hasConnectionIssue = false; // 연결 문제 상태
  }

  initialize() {
    this.connectDevice();
  }

  // 자동 검색을 위한 함수
  async connectDevice() {
    try {
      if (this.machine) {
        return {
          success: false,
          message: '이미 연결된 세차기가 있습니다.',
          status: this.getMachineStatus(),
        };
      }

      const ports = await SerialPort.list();
      const fl30Port = ports.find((port) => port.vendorId === '0403' && port.productId === '6001');

      if (!fl30Port) {
        return {
          success: false,
          message: '연결 가능한 세차기를 찾을 수 없습니다.',
          status: this.getMachineStatus(),
        };
      }

      const result = await this.addMachine({
        type: 'FL30',
        config: {
          id: fl30Port.path,
          portName: fl30Port.path,
          address: 0x01,
        },
      });

      return {
        ...result,
        status: this.getMachineStatus(),
      };
    } catch (error) {
      log.error('세차기 연결 중 오류:', error);
      return {
        success: false,
        error: error.message,
        status: this.getMachineStatus(),
      };
    }
  }

  async disconnectDevice() {
    try {
      if (!this.machine) {
        return {
          success: false,
          message: '연결된 세차기가 없습니다.',
          status: this.getMachineStatus(),
        };
      }

      this.clearStatusCheck();
      await this.machine.disconnect();
      this.machine = null;
      this.lastStatusReceived = null;
      this.hasConnectionIssue = false;

      return {
        success: true,
        message: '세차기 연결이 해제되었습니다.',
        status: this.getMachineStatus(),
      };
    } catch (error) {
      log.error('세차기 연결 해제 중 오류:', error);
      return {
        success: false,
        error: error.message,
        status: this.getMachineStatus(),
      };
    }
  }

  async addMachine({ type, config }) {
    try {
      if (this.machine) {
        return { success: false, message: '이미 연결된 세차기가 있습니다.' };
      }

      let machine;
      switch (type) {
        case 'SG90':
          machine = new SG90CarWash(config);
          break;
        case 'FL30':
          machine = new FL30CarWash(config);
          break;
        default:
          throw new Error('알 수 없는 세차기 유형입니다');
      }

      await machine.initialize();
      this.machine = machine;
      this.setupMachineEventListeners(machine);
      this.startPeriodicStatusCheck(true);

      if (!this.statusCheckInterval) {
        this.startStatusCheck();
      }

      return { success: true, message: `${type} 세차기가 추가되었습니다.` };
    } catch (error) {
      log.error('세차기 추가 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  setupMachineEventListeners(machine) {
    machine.on('statusUpdate', (state) => {
      if (this.lastState?.status !== state.status) {
        log.info('세차기 상태 변경:', state);
        this.lastState = { ...state };
      }
      this.sendStatusUpdate(state);
      this.lastStatusReceived = Date.now();
      this.clearConnectionIssue();
    });
    machine.on('error', (error) => this.handleMachineError(error));
  }

  sendStatusUpdate(state) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      window.webContents.send('status-update', state);
    });
  }

  async startWash(event, mode) {
    if (!this.machine) {
      throw new Error('연결된 세차기가 없습니다');
    }
    try {
      const result = await this.machine.start(mode);
      return result;
    } catch (error) {
      log.error('세차 시작 중 오류 발생:', error);
      throw error;
    }
  }

  async stopWash(event) {
    if (!this.machine) {
      throw new Error('연결된 세차기가 없습니다');
    }
    try {
      await this.machine.stop();
      return { success: true, message: '세차가 중지되었습니다.' };
    } catch (error) {
      log.error('세차 중지 중 오류 발생:', error);
      throw error;
    }
  }

  async reset(event) {
    if (!this.machine) {
      throw new Error('연결된 세차기가 없습니다');
    }
    try {
      await this.machine.reset();
      return { success: true, message: '세차기가 초기화되었습니다.' };
    } catch (error) {
      log.error('세차기 리셋 중 오류 발생:', error);
      throw error;
    }
  }

  startPeriodicStatusCheck(turnOn) {
    if (!this.machine) return;

    if (turnOn) {
      this.machine.startStatusCheck();
    } else {
      this.machine.stopStatusCheck();
    }
  }

  startStatusCheck() {
    this.statusCheckInterval = setInterval(() => {
      this.checkMachineStatus();
    }, 10000);
  }

  checkMachineStatus() {
    if (this.lastStatusReceived && Date.now() - this.lastStatusReceived > 30000) {
      this.handleConnectionIssue();
    }
  }

  handleConnectionIssue() {
    if (!this.hasConnectionIssue) {
      log.error(`세차기와의 연결에 문제가 있습니다.`);
      this.sendStatusUpdate({ error: '연결에 문제가 있습니다.' });
      this.hasConnectionIssue = true;
    }
  }

  clearConnectionIssue() {
    if (this.hasConnectionIssue) {
      log.info(`세차기와의 연결 문제가 해결되었습니다.`);
      this.sendStatusUpdate({ message: '연결 문제가 해결되었습니다.' });
      this.hasConnectionIssue = false;
    }
  }

  clearStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  handleMachineError(error) {
    log.error(`세차기 오류:`, error);
    this.sendStatusUpdate({ error: error.message });
  }

  // 연결 상태 및 정보를 반환하는 메서드
  async getMachineStatus() {
    try {
      if (!this.machine) {
        return {
          connected: false,
          error: '세차기가 연결되지 않았습니다.',
        };
      }

      // 직렬화 가능한 단순 객체만 반환
      return {
        connected: true,
        status: {
          currentStep: this.machine.currentStep || '없음',
          remainingTime: this.machine.remainingTime || 0,
          progress: this.machine.progress || 0,
          error: this.machine.error || null,
        },
        machineInfo: {
          type: this.machine.constructor.name,
          portName: this.machine.config?.portName,
        },
        lastStatusReceived: this.machine.lastStatusReceived
          ? this.machine.lastStatusReceived.toISOString()
          : null,
      };
    } catch (error) {
      log.error('getMachineStatus error:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}

export default CarWashManager;
