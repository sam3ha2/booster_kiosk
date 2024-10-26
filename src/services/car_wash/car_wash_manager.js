const { ipcMain, BrowserWindow } = require('electron');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');
const EventEmitter = require('events');

class CarWashManager extends EventEmitter {
  constructor() {
    super();
    this.machines = new Map();
    this.lastStatusReceived = new Map(); // 마지막 상태 수신 시간 저장
    this.statusCheckInterval = null; // 상태 체크 인터벌
    this.connectionIssues = new Set(); // 연결 문제 발생한 세차기 ID 저장
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('start-wash', this.startWash.bind(this));
    ipcMain.handle('stop-wash', this.stopWash.bind(this));
  }

  async addMachine({ type, config }) {
    try {
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
      this.machines.set(config.id, machine);
      this.setupMachineEventListeners(config.id, machine);
      this.startPeriodicStatusCheck(config.id, true);

      // 상태 체크 시작
      if (!this.statusCheckInterval) {
        this.startStatusCheck();
      }

      return { success: true, message: `${type} 세차기가 추가되었습니다.` };
    } catch (error) {
      console.error('세차기 추가 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  setupMachineEventListeners(machineId, machine) {
    machine.on('statusUpdate', (state) => {
      console.log(`세차기 ${machineId} 상태 변경:`, state);
      this.sendStatusUpdate(machineId, state);
      this.lastStatusReceived.set(machineId, Date.now()); // 마지막 상태 수신 시간 기록
      this.clearConnectionIssue(machineId); // 연결 문제 해제
    });
    machine.on('error', (error) => this.handleMachineError(machineId, error));
  }

  sendStatusUpdate(machineId, state) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('status-update', { machineId, state });
    });
  }

  async startWash(event, machineId, mode) {
    const machine = this.getMachine(machineId);
    try {
      const result = await machine.start(mode);
      return result;
    } catch (error) {
      console.error('세차 시작 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  async stopWash(event, machineId) {
    const machine = this.getMachine(machineId);
    try {
      await machine.stop();
      return { success: true, message: '세차가 중지되었습니다.' };
    } catch (error) {
      console.error('세차 중지 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  startPeriodicStatusCheck(machineId, turnOn) {
    const machine = this.getMachine(machineId);
    if (turnOn) {
      machine.startStatusCheck();
    } else {
      machine.stopStatusCheck();
    }
  }

  startStatusCheck() {
    this.statusCheckInterval = setInterval(() => {
      this.checkAllMachinesStatus();
    }, 10000); // 10초마다 상태 체크
  }

  checkAllMachinesStatus() {
    this.machines.forEach((machine, machineId) => {
      const lastReceived = this.lastStatusReceived.get(machineId);
      if (lastReceived && (Date.now() - lastReceived > 30000)) {
        // 상태가 30초 이상 업데이트되지 않은 경우 처리
        this.handleConnectionIssue(machineId);
      }
    });
  }

  handleConnectionIssue(machineId) {
    if (!this.connectionIssues.has(machineId)) {
      console.error(`세차기 ${machineId}와의 연결에 문제가 있습니다.`);
      this.sendStatusUpdate(machineId, { error: '연결에 문제가 있습니다.' });
      this.connectionIssues.add(machineId); // 에러 상태 추가
    }
  }

  clearConnectionIssue(machineId) {
    if (this.connectionIssues.has(machineId)) {
      console.log(`세차기 ${machineId}와의 연결 문제가 해결되었습니다.`);
      this.sendStatusUpdate(machineId, { message: '연결 문제가 해결되었습니다.' });
      this.connectionIssues.delete(machineId); // 에러 상태 제거
    }
  }

  clearStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  getMachine(machineId) {
    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error('세차기를 찾을 수 없습니다');
    }
    return machine;
  }

  handleMachineError(machineId, error) {
    console.error(`세차기 ${machineId} 오류:`, error);
    this.sendStatusUpdate(machineId, { error: error.message });
  }
}

module.exports = CarWashManager;
