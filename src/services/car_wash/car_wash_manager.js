const { ipcMain } = require('electron');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');
const EventEmitter = require('events');

class CarWashManager extends EventEmitter {
  constructor() {
    super();
    this.machines = new Map();
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

      return { success: true, message: `${type} 세차기가 추가되었습니다.` };
    } catch (error) {
      console.error('세차기 추가 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  setupMachineEventListeners(machineId, machine) {
    machine.on('stateChanged', (state) => {
      console.log(`세차기 ${machineId} 상태 변경:`, state);  // 로그 추가
      this.emit('status-update', { machineId, state });
    });
    machine.on('error', (error) => this.handleMachineError(machineId, error));
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
      return { success: false, error: error.message };
    }
  }

  async getStatus(machineId) {
    const machine = this.getMachine(machineId);
    return {
      success: true,
      status: machine.getState()
    };
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
    this.emit('status-update', { machineId, error: error.message });
  }
}

module.exports = CarWashManager;
