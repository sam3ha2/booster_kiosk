const { ipcMain } = require('electron');
const TypeACarWash = require('./machine_types/type_a_car_wash');
const SG90CarWash = require('./machine_types/sg90_car_wash');
const FL30CarWash = require('./machine_types/fl30_car_wash');

class CarWashManager {
  constructor() {
    this.machines = new Map();
    this.currentProcesses = new Map();
    this.subscribers = new Map();
    this.updateIntervals = new Map();
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('car-wash-command', this.handleCarWashCommand.bind(this));
    ipcMain.on('subscribe-process-updates', this.handleSubscribeProcessUpdates.bind(this));
    ipcMain.on('unsubscribe-process-updates', this.handleUnsubscribeProcessUpdates.bind(this));
  }

  handleSubscribeProcessUpdates(event, machineId) {
    if (!this.subscribers.has(machineId)) {
      this.subscribers.set(machineId, new Set());
    }
    this.subscribers.get(machineId).add(event.sender);
    
    // 현재 상태를 즉시 전송
    const currentProcess = this.currentProcesses.get(machineId);
    if (currentProcess) {
      event.sender.send('process-update', { machineId, process: currentProcess });
    }
  }

  handleUnsubscribeProcessUpdates(event, machineId) {
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

    return { success: true, message: `${type} 세차기가 추가되었습니다.` };
  }

  async startWash(machineId, mode) {
    const machine = this.getMachine(machineId);
    await machine.start(mode);
    this.startProcessUpdates(machineId);
    return { success: true, message: '세차가 시작되었습니다.' };
  }

  async stopWash(machineId) {
    const machine = this.getMachine(machineId);
    await machine.stop();
    this.stopProcessUpdates(machineId);
    return { success: true, message: '세차가 중지되었습니다.' };
  }

  startProcessUpdates(machineId) {
    const machine = this.getMachine(machineId);
    if (typeof machine.getCurrentProcess !== 'function') {
      return;
    }

    const updateProcess = async () => {
      const process = await machine.getCurrentProcess();
      this.updateCurrentProcess(machineId, process);

      // 세차 마지막 프로세스이면 1초 단위로 상태 조회하여 종료 판단 빨리 할 수 있도록
      if (process === machine.getLastProcess()) {
        clearInterval(this.updateIntervals.get(machineId));
        this.updateIntervals.set(machineId, setInterval(updateProcess, 1000));
      }
    };

    this.updateIntervals.set(machineId, setInterval(updateProcess, 1000));
    updateProcess();
  }

  stopProcessUpdates(machineId) {
    clearInterval(this.updateIntervals.get(machineId));
    this.updateIntervals.delete(machineId);
    this.updateCurrentProcess(machineId, '대기 중');
  }

  updateCurrentProcess(machineId, process) {
    this.currentProcesses.set(machineId, process);
    this.notifySubscribers(machineId, process);
  }

  notifySubscribers(machineId, process) {
    const subscribers = this.subscribers.get(machineId);
    if (subscribers) {
      subscribers.forEach(subscriber => {
        subscriber.send('process-update', { machineId, process });
      });
    }
  }

  async getStatus(machineId) {
    const machine = this.getMachine(machineId);
    const status = await machine.getCurrentProcess();
    return { success: true, status };
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