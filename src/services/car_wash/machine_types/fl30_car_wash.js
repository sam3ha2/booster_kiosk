const AbstractCarWashMachine = require('../abstract_car_wash_machine');
const ModbusRTU = require('modbus-serial');
const EventEmitter = require('events');

class FL30CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.client = new ModbusRTU();
    this.eventEmitter = new EventEmitter();
    this.address = 1;  // Modbus slave address
    this.isConnected = false;
    this.statusCheckInterval = null;
    this.STATUS_CHECK_INTERVAL = 1000; // 1초마다 상태 확인
    this.isWashing = false;
    this.currentStep = '';
  }

  async initialize() {
    try {
      // Modbus RTU 연결 설정
      await this.client.connectRTUBuffered(this.config.portName, {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'even'
      });

      // Slave ID 설정
      this.client.setID(this.address);
      this.isConnected = true;

      console.log('FL3.0 세차기 초기화 완료');
    } catch (error) {
      console.error('FL3.0 세차기 초기화 중 오류:', error);
      throw error;
    }
  }

  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  async start(mode) {
    try {
      let address;
      switch (mode) {
        case 'MODE1':
          address = 0xD0;  // M208
          break;
        case 'MODE2':
          address = 0xD1;  // M209
          break;
        case 'MODE3':
          address = 0xD2;  // M210
          break;
        default:
          throw new Error('알 수 없는 세차 모드');
      }

      await this.client.writeCoil(address, true);
      this.isWashing = true;
      this.eventEmitter.emit('startSuccess');
      return { success: true, message: '세차가 시작되었습니다.' };
    } catch (error) {
      console.error('세차 시작 실패:', error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.client.writeCoil(0xCE, true);  // M206
      this.isWashing = false;
      this.eventEmitter.emit('stopped');
    } catch (error) {
      console.error('세차 정지 실패:', error);
      throw error;
    }
  }

  async reset() {
    try {
      await this.client.writeCoil(0xCF, true);  // M207
      this.isWashing = false;
      this.eventEmitter.emit('reset');
    } catch (error) {
      console.error('리셋 실패:', error);
      throw error;
    }
  }

  interpretStep(status) {
    const statusMap = {
      0: '대기 중',
      1: '세차 종료',
      2: '세제 분사 중',
      3: '스노우폼 분사 중',
      4: '왁스 분사 중',
      5: '건조 중',
      6: '고압수 세차 중',
      7: '하부 세차 중',
      8: '세제 분사 완료, 대기 중',
      9: '스노우폼 분사 완료, 고압수 대기 중',
      10: '결제 성공'
    };
    return statusMap[status] || this.currentStep;
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(command.replace(/\s/g, ''), 'hex');
      this.client.write(buffer, (err) => {
        if (err) {
          console.error('명령어 전송 중 오류:', err);
          reject(err);
        } else {
          console.log(`명령어 전송: ${command}`);
          resolve();
        }
      });
    });
  }

  startStatusCheck() {
    this.statusCheckInterval = setInterval(() => {
      if (this.isConnected) {
        this.checkStatus();
      }
    }, this.STATUS_CHECK_INTERVAL);
  }

  // Modbus 함수 코드 3 (Read Holding Registers)를 사용하여 상태 확인
  async checkStatus() {
    try {
      const result = await this.client.readHoldingRegisters(0x64, 1);  // D100
      const status = result.data[0];
      this.currentStep = this.interpretStep(status);
      this.eventEmitter.emit('statusUpdate', {
        status: status,
        currentStep: this.currentStep
      });
    } catch (error) {
      console.error('상태 확인 실패:', error);
    }
  }

  // Modbus 함수 코드 1 (Read Coils)를 사용하여 차량 존재 여부 확인
  async checkExistCar() {
    try {
      const result = await this.client.readCoils(0x2E, 1);  // M46
      this.eventEmitter.emit('carExist', result.data[0]);
    } catch (error) {
      console.error('차량 존재 확인 실패:', error);
    }
  }

  // Modbus 함수 코드 1 (Read Coils)를 사용하여 오류 상태 확인
  async checkErrorStatus() {
    try {
      const result = await this.client.readCoils(0x11D, 1);  // M285
      this.eventEmitter.emit('errorStatusUpdate', result.data[0]);
    } catch (error) {
      console.error('오류 상태 확인 실패:', error);
    }
  }

  // Modbus 함수 코드 1 (Read Coils)를 사용하여 세차 완료 상태 확인
  async checkWashingComplete() {
    try {
      const result = await this.client.readCoils(0x88, 1);  // M136
      this.eventEmitter.emit('washingComplete', result.data[0] === 1);
    } catch (error) {
      console.error('세차 완료 상태 확인 실패:', error);
    }
  }

  stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }

  async reconnect() {
    try {
      await this.client.close();
      await this.initialize();
      console.log('재연결 성공');
    } catch (error) {
      console.error('재연결 실패:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.isConnected) {
      this.client.close();
      this.isConnected = false;
    }
  }
}

module.exports = FL30CarWash;
