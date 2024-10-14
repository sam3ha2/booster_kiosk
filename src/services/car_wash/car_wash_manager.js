const { ipcMain } = require('electron');
const TypeACarWash = require('./machine_types/type_a_car_wash');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');

class CarWashManager {
  constructor() {
    this.machines = new Map();
    this.machineStates = new Map();
    this.subscribers = new Map();
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('car-wash-command', this.handleCarWashCommand.bind(this));
    ipcMain.on('subscribe-updates', this.handleSubscribeUpdates.bind(this));
    ipcMain.on('unsubscribe-updates', this.handleUnsubscribeUpdates.bind(this));
  }

  handleSubscribeUpdates(event, machineId) {
    if (!this.subscribers.has(machineId)) {
      this.subscribers.set(machineId, new Set());
    }
    this.subscribers.get(machineId).add(event.sender);
    
    const currentState = this.machineStates.get(machineId);
    if (currentState) {
      event.sender.send('state-update', { machineId, state: currentState });
    }
  }

  handleUnsubscribeUpdates(event, machineId) {
    const machineSubscribers = this.subscribers.get(machineId);
    if (machineSubscribers) {
      machineSubscribers.delete(event.sender);
    }
  }

  async handleCarWashCommand(event, { command, machineId, data }) {
    try {
      switch (command) {
        case 'add-machine':
          return await this.addMachine(data);
        case 'start-wash':
          return await this.startWash(machineId, data.mode);
        case 'stop-wash':
          return await this.stopWash(machineId);
        case 'get-status':
          return await this.getStatus(machineId);
        case 'get-steps':
          return await this.getSteps(machineId);
        default:
          throw new Error('알 수 없는 명령입니다');
      }
    } catch (error) {
      console.error('Car wash command error:', error);
      return { success: false, error: error.message, stack: error.stack };
    }
  }

  async addMachine({ type, config }) {
    let machine;
    switch (type) {
      case 'TypeA':
        machine = new TypeACarWash(config);
        break;
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
    machine.on('stateUpdate', (state) => this.handleMachineStateUpdate(config.id, state));

    return { success: true, message: `${type} 세차기가 추가되었습니다.` };
  }

  async startWash(machineId, mode) {
    const machine = this.getMachine(machineId);
    await machine.start(mode);
    // 세차 시작 후 상태 업데이트를 즉시 요청
    const initialState = await machine.getState();
    this.handleMachineStateUpdate(machineId, initialState);
    return { success: true, message: '세차가 시작되었습니다.' };
  }

  async stopWash(machineId) {
    const machine = this.getMachine(machineId);
    await machine.stop();
    return { success: true, message: '세차가 중지되었습니다.' };
  }

  handleMachineStateUpdate(machineId, state) {
    this.machineStates.set(machineId, state);
    this.notifySubscribers(machineId, state);
  }

  notifySubscribers(machineId, state) {
    const subscribers = this.subscribers.get(machineId);
    if (subscribers) {
      subscribers.forEach(subscriber => {
        subscriber.send('state-update', { machineId, state });
      });
    }
  }

  async getStatus(machineId) {
    const machine = this.getMachine(machineId);
    const state = await machine.getState();
    return {
      success: true,
      status: state
    };
  }

  async getSteps(machineId) {
    const machine = this.getMachine(machineId);
    const state = await machine.getState();
    return {
      success: true,
      steps: state.steps,
      currentStep: state.currentStep
    };
  }

  getMachine(machineId) {
    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error('세차기를 찾을 수 없습니다');
    }
    return machine;
  }
}

module.exports = CarWashManager;
