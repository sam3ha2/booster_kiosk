const { ipcMain, BrowserWindow } = require('electron');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');
const EventEmitter = require('events');
const SerialPort = require('serialport');

class CarWashManager extends EventEmitter {
  constructor() {
    super();
    this.machine = null; // 단일 머신 저장
    this.lastStatusReceived = null; // 마지막 상태 수신 시간
    this.statusCheckInterval = null;
    this.hasConnectionIssue = false; // 연결 문제 상태
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('start-wash', this.startWash.bind(this));
    ipcMain.handle('stop-wash', this.stopWash.bind(this));
  }

  initialize() {
    this.connectDevice();
  }

  // 자동 검색을 위한 함수
  async connectDevice() {
    if (this.machine) {
      console.log('이미 연결된 세차기가 있습니다.');
      return;
    }

    const ports = await SerialPort.list();
    const fl30Port = ports.find((port) =>
      port.vendorId === '1234' && port.productId === 'abcd'
    );

    if (fl30Port) {
      await this.addMachine({
        type: 'FL30',
        config: {
          id: fl30Port.path,
          portName: fl30Port.path,
          address: 0x01
        }
      });
    }
  }

  disconnectDevice() {
    this.clearStatusCheck();
    this.machine.disconnect();
    this.machine = null;
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
      console.error('세차기 추가 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  setupMachineEventListeners(machine) {
    machine.on('statusUpdate', (state) => {
      console.log(`세차기 상태 변경:`, state);
      this.sendStatusUpdate(state);
      this.lastStatusReceived = Date.now();
      this.clearConnectionIssue();
    });
    machine.on('error', (error) => this.handleMachineError(error));
  }

  sendStatusUpdate(state) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('status-update', { state });
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
      console.error('세차 시작 중 오류 발생:', error);
      return { success: false, error: error.message };
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
      console.error('세차 중지 중 오류 발생:', error);
      return { success: false, error: error.message };
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
    if (this.lastStatusReceived && (Date.now() - this.lastStatusReceived > 30000)) {
      this.handleConnectionIssue();
    }
  }

  handleConnectionIssue() {
    if (!this.hasConnectionIssue) {
      console.error(`세차기와의 연결에 문제가 있습니다.`);
      this.sendStatusUpdate({ error: '연결에 문제가 있습니다.' });
      this.hasConnectionIssue = true;
    }
  }

  clearConnectionIssue() {
    if (this.hasConnectionIssue) {
      console.log(`세차기와의 연결 문제가 해결되었습니다.`);
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
    console.error(`세차기 오류:`, error);
    this.sendStatusUpdate({ error: error.message });
  }
}

module.exports = CarWashManager;
