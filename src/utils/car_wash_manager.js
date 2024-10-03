const { ipcMain } = require('electron');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const TypeACarWash = require('./machine_types/type_a_car_wash');
// 다른 세차기 유형들을 여기에 import 합니다.

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
    const serialPort = new SerialPort({
      path: config.portName,
      baudRate: config.baudRate,
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    serialPort.on('open', () => {
      console.log(`시리얼 포트 ${config.portName}가 열렸습니다.`);
    });

    let machine;
    switch (type) {
      case 'TypeA':
        machine = new TypeACarWash(serialPort, config);
        break;
      // 여기에 다른 세차기 유형들을 추가합니다.
      default:
        throw new Error('Unknown car wash machine type');
    }

    parser.on('data', (data) => machine.onDataReceived(data));

    serialPort.on('error', (err) => {
      console.error(`시리얼 포트 ${config.portName} 오류:`, err);
    });

    await machine.initialize();
    this.machines.set(config.id, machine);

    return { success: true, message: `${type} 세차기가 추가되었습니다.` };
  }

  async controlCarWash(event, { machineId, command }) {
    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`세차기 ID ${machineId}를 찾을 수 없습니다.`);
    }

    switch (command) {
      case 'start':
        await machine.start();
        break;
      case 'stop':
        await machine.stop();
        break;
      case 'status':
        return await machine.status();
      default:
        throw new Error(`알 수 없는 명령: ${command}`);
    }

    return { success: true, message: `세차기 ${machineId}에 ${command} 명령 전송 완료` };
  }
}

module.exports = CarWashManager;