const { ipcMain } = require('electron');
const TypeACarWash = require('./machine_types/type_a_car_wash');
const SG90CarWash = require('./machine_types/sg90_car_wash');

class CarWashManager {
  constructor() {
    this.machines = new Map();
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('control-car-wash', this.controlCarWash.bind(this));
    ipcMain.handle('add-car-wash-machine', this.addMachine.bind(this));
  }

  async addMachine(event, { type, config }) {
    let machine;
    switch (type) {
      case 'TypeA':
        machine = new TypeACarWash(config);
        break;
      case 'SG90':
        machine = new SG90CarWash(config);
        break;
      default:
        throw new Error('Unknown car wash machine type');
    }

    await machine.initialize();
    this.machines.set(config.id, machine);

    return { success: true, message: `${type} 세차기가 추가되었습니다.` };
  }

  // ... 기존의 다른 메서드들 ...
}

module.exports = CarWashManager;