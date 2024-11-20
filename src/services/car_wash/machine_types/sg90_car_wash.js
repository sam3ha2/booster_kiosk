import AbstractCarWashMachine from '../abstract_car_wash_machine.js';
import ModbusRTU from 'modbus-serial';

// TODO: 미완성
class SG90CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.client = new ModbusRTU();
    this.address = 1; // SG90의 주소
  }

  async initialize() {
    await this.client.connectAsciiSerial(this.config.portName, {
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even',
    });
    this.client.setID(this.address);
    console.log('SG90 세차기 초기화 완료');
  }

  async start(mode) {
    const commands = {
      MODE1: 0x0905,
      MODE2: 0x0906,
      MODE3: 0x0904,
      MODE4: 0x0908,
    };
    await this.client.writeRegister(commands[mode], 0xff00);
    console.log(`SG90 세차기 모드 ${mode} 시작 명령 전송`);
  }

  async stop() {
    await this.client.writeRegister(0x083c, 0xff00);
    console.log('SG90 세차기 정지 명령 전송');
  }

  async status() {
    const result = await this.client.readCoils(0x08d6, 1);
    return result.data[0] ? '작동 중' : '대기 중';
  }

  async pause() {
    await this.client.writeRegister(0x0847, 0xff00);
    console.log('SG90 세차기 일시 정지 명령 전송');
  }

  async resume() {
    await this.client.writeRegister(0x0847, 0x0000);
    console.log('SG90 세차기 재개 명령 전송');
  }

  async reset() {
    await this.client.writeRegister(0x0820, 0xff00);
    console.log('SG90 세차기 리셋 명령 전송');
  }

  async checkCarPresence() {
    const result = await this.client.readCoils(0x0af0, 1);
    return result.data[0] ? '차량 있음' : '차량 없음';
  }

  async checkReadyForNextWash() {
    const result = await this.client.readCoils(0x08d6, 1);
    return result.data[0] ? '준비 완료' : '준비 중';
  }

  async checkCarEntryStatus() {
    const result = await this.client.readCoils(0x0866, 1);
    return result.data[0] ? '차량 진입 완료' : '차량 진입 중';
  }

  async checkErrorStatus() {
    const result = await this.client.readCoils(0x08d9, 1);
    return result.data[0] ? '오류 발생' : '정상';
  }

  async getTotalWashCount() {
    const result = await this.client.readHoldingRegisters(0x19f6, 1);
    return result.data[0];
  }

  async getDailyWashCount() {
    const result = await this.client.readHoldingRegisters(0x19f8, 1);
    return result.data[0];
  }
}

export default SG90CarWash;
