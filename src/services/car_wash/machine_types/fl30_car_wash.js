const AbstractCarWashMachine = require('../abstract_car_wash_machine');
const ModbusRTU = require('modbus-serial');

class FL30CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.client = new ModbusRTU();
    this.address = 0x0C; // FL3.0의 주소 (12)
  }

  async initialize() {
    await this.client.connectAsciiSerial(this.config.portName, {
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even'
    });
    this.client.setTimeout(3000);
    this.client.setID(this.address);
    console.log('FL3.0 세차기 초기화 완료');
  }

  async start(mode) {
    let address;
    switch (mode) {
      case 'MODE1':
        address = 0x012F; // 간단 세차
        break;
      case 'MODE2':
        address = 0x012E; // 정밀 세차
        break;
      default:
        throw new Error('알 수 없는 세차 모드');
    }
    await this.client.writeCoil(address, true);
    console.log(`FL3.0 세차기 ${mode} 모드 시작 명령 전송`);
  }

  async stop() {
    await this.client.writeCoil(0x0005, true);
    console.log('FL3.0 세차기 정지(리셋) 명령 전송');
  }

  async status() {
    const [statusCoils, runningCoils, processRegister] = await Promise.all([
      this.client.readCoils(0x0015, 10),  // M21-M24, M13-M18
      this.client.readCoils(0x0092, 2),   // M146, M147
      this.client.readHoldingRegisters(0x000A, 1)  // D10
    ]);

    return {
      origin: statusCoils.data[0] && statusCoils.data[1] && statusCoils.data[3],  // M21, M22, M24
      initial: statusCoils.data[0] && statusCoils.data[1] && statusCoils.data[3] && !statusCoils.data[4] && !statusCoils.data[5],  // M21, M22, M24, !M13, !M14
      running: runningCoils.data[0],  // M146
      atOrigin: runningCoils.data[1],  // M147
      carStopped: statusCoils.data[8],  // M17
      carNotStopped: statusCoils.data[6],  // M15
      carOverPosition: statusCoils.data[7],  // M16
      error: statusCoils.data[9],  // M18
      currentProcess: processRegister.data[0]  // D10
    };
  }

  async reset() {
    await this.client.writeCoil(0x0005, true);
    console.log('FL3.0 세차기 리셋 명령 전송');
  }

  async checkOriginStatus() {
    const result = await this.client.readCoils(0x0015, 4); // M21, M22, M23, M24 읽기
    return result.data[0] && result.data[1] && result.data[3]; // M21, M22, M24 확인
  }

  async checkInitialStatus() {
    const result = await this.client.readCoils(0x0015, 10); // M21-M24, M13-M18 읽기
    return result.data[0] && result.data[1] && result.data[3] && !result.data[4] && !result.data[5]; // M21, M22, M24, !M13, !M14
  }

  async checkRunningStatus() {
    const result = await this.client.readCoils(0x0092, 1); // M146
    return result.data[0];
  }

  async checkAtOriginStatus() {
    const result = await this.client.readCoils(0x0093, 1); // M147
    return result.data[0];
  }

  async checkCarStoppedStatus() {
    const result = await this.client.readCoils(0x0011, 1); // M17
    return result.data[0];
  }

  async checkCarNotStoppedStatus() {
    const result = await this.client.readCoils(0x000F, 1); // M15
    return result.data[0];
  }

  async checkCarOverPositionStatus() {
    const result = await this.client.readCoils(0x0010, 1); // M16
    return result.data[0];
  }

  async checkErrorStatus() {
    const result = await this.client.readCoils(0x0012, 1); // M18
    return result.data[0];
  }

  async getCurrentProcess() {
    const result = await this.client.readHoldingRegisters(0x000A, 1); // D10
    switch (result.data[0]) {
      case 1: return '무세제 세차';
      case 2: return '거품';
      case 3: return '세척';
      case 4: return '왁스';
      case 5: return '건조';
      case 0: return '대기 중';
      default: return '알 수 없는 상태';
    }
  }
}

module.exports = FL30CarWash;