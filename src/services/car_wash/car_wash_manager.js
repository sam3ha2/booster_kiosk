const { ipcMain } = require('electron');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');
const EventEmitter = require('events');

class CarWashManager extends EventEmitter {
  constructor() {
    super();
    this.machines = new Map();
    this.subscribers = new Map();
    this.machineStates = new Map();
    this.MAX_RECOVERY_ATTEMPTS = 3;
    this.WASH_TIMEOUT = 20 * 60 * 1000; // 20분 (밀리초 단위)
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
      this.initializeMachineState(config.id);
      this.setupMachineEventListeners(config.id, machine);
      // await this.checkInitialMachineState(config.id, machine);

      return { success: true, message: `${type} 세차기가 추가되었습니다.` };
    } catch (error) {
      console.error('세차기 추가 중 오류 발생:', error);
      return { success: false, error: error.message };
    }
  }

  setupMachineEventListeners(machineId, machine) {
    machine.on('started', () => this.handleMachineStarted(machineId));
    machine.on('stopped', () => this.handleMachineStopped(machineId));
    machine.on('errorStatusUpdate', (isError) => this.handleErrorStatusUpdate(machineId, isError));
    machine.on('washingComplete', (isComplete) => this.handleWashingComplete(machineId, isComplete));
    machine.on('statusUpdate', (status) => this.handleStatusUpdate(machineId, status));
    machine.on('startFailed', () => this.handleStartFailed(machineId));
  }

  initializeMachineState(machineId) {
    this.machineStates.set(machineId, {
      machineStatus: 'idle',
      currentStep: '',
      inputStatus: 'none',
      inputTimestamp: null,
      recoveryAttempts: 0
    });
  }

  async startWash(machineId, mode) {
    const machine = this.getMachine(machineId);
    const state = this.machineStates.get(machineId);

    if (state.inputStatus !== 'none') {
      throw new Error('이미 세차 프로세스가 진행 중입니다.');
    }

    state.inputStatus = 'waiting';
    state.inputTimestamp = Date.now();
    state.recoveryAttempts = 0;

    try {
      await machine.start(mode);
      this.startWashTimeout(machineId);
    } catch (error) {
      state.inputStatus = 'none';
      state.inputTimestamp = null;
      throw error;
    }

    return { success: true, message: '세차 시작 명령을 보냈습니다.' };
  }

  async stopWash(machineId) {
    const machine = this.getMachine(machineId);
    await machine.stop();
    this.resetMachineState(machineId);
    return { success: true, message: '세차가 중지되었습니다.' };
  }

  handleMachineStarted(machineId) {
    const state = this.machineStates.get(machineId);
    state.machineStatus = 'washing';
    state.inputStatus = 'inProgress';
    this.notifySubscribers(machineId, state);
  }

  handleMachineStopped(machineId) {
    this.resetMachineState(machineId);
  }

  handleErrorStatusUpdate(machineId, isError) {
    const state = this.machineStates.get(machineId);
    state.error = isError;
    this.notifySubscribers(machineId, state);
  }

  handleWashingComplete(machineId, isComplete) {
    if (isComplete) {
      this.completeWash(machineId);
    }
  }

  handleStatusUpdate(machineId, status) {
    const state = this.machineStates.get(machineId);
    const machine = this.getMachine(machineId);
    state.currentStep = machine.interpretStep(status.status);
    state.processStatus = status.status;

    if (state.machineStatus === 'washing' && (status.status === 0 || status.status === 1)) {
      this.completeWash(machineId);
    }

    this.notifySubscribers(machineId, state);
  }

  handleStartFailed(machineId) {
    const state = this.machineStates.get(machineId);
    state.inputStatus = 'none';
    state.machineStatus = 'error';
    state.error = '세차 시작 실패';
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
    const state = this.machineStates.get(machineId);
    return {
      success: true,
      status: state
    };
  }

  async getSteps(machineId) {
    const state = this.machineStates.get(machineId);
    return {
      success: true,
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

  completeWash(machineId) {
    const state = this.machineStates.get(machineId);
    state.inputStatus = 'completed';
    state.machineStatus = 'idle';
    state.inputTimestamp = null;
    this.notifySubscribers(machineId, state);
  }

  handleError(machineId, errorMessage) {
    const state = this.machineStates.get(machineId);
    state.machineStatus = 'error';
    state.inputStatus = 'none';
    state.inputTimestamp = null;
    state.error = errorMessage;
    this.notifySubscribers(machineId, state);
  }

  startWashTimeout(machineId) {
    setTimeout(() => {
      const state = this.machineStates.get(machineId);
      if (state && state.inputStatus === 'inProgress') {
        this.completeWash(machineId);
      }
    }, this.WASH_TIMEOUT);
  }

  resetMachineState(machineId) {
    const state = this.machineStates.get(machineId);
    state.machineStatus = 'idle';
    state.currentStep = '';
    state.inputStatus = 'none';
    state.inputTimestamp = null;
    state.recoveryAttempts = 0;
    state.error = null;
    this.notifySubscribers(machineId, state);
  }

  getCurrentState(machineId) {
    return this.machineStates.get(machineId);
  }
}

module.exports = CarWashManager;
