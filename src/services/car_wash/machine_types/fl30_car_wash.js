const AbstractCarWashMachine = require('../abstract_car_wash_machine');
const ModbusRTU = require('modbus-serial');
const EventEmitter = require('events');

class FL30CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.client = new ModbusRTU();
    this.address = 0x01;
    this.eventEmitter = new EventEmitter();
    this.updateInterval = null;
    this.totalTime = 0;
    this.remainingTime = 0;
    this.currentMode = null;
    this.washTimer = null;
    this.washStartTime = null;
  }

  async initialize() {
    try {
      await this.client.connectAsciiSerial(this.config.portName, {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'even'
      });
      this.client.setTimeout(5000);
      this.client.setID(this.address);
      console.log('FL3.0 세차기 초기화 완료');
    } catch (error) {
      console.error('FL3.0 세차기 초기화 중 오류:', error);
      throw error;
    }
  }

  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  startStateUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        const state = await this.getState();
        this.eventEmitter.emit('stateUpdate', state);
        
        if (state.isAvailable && !state.isWashing) {
          console.log('세차 완료.');
        }
      } catch (error) {
        console.error('상태 업데이트 중 오류:', error);
        // 연결 재시도
        try {
          await this.reconnect();
        } catch (reconnectError) {
          console.error('재연결 실패:', reconnectError);
        }
      }
    }, 2000); // 업데이트 간격을 2초로 늘림
  }

  stopStateUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async start(mode) {
    let address;
    this.currentMode = mode;
    switch (mode) {
      case 'MODE1':
        address = 0x00D0; // M208 - 정밀 세차 모드
        this.totalTime = 12 * 60; // 12분
        break;
      case 'MODE2':
        address = 0x00D1; // M209 - 빠른 세차 모드
        this.totalTime = 8 * 60; // 8분
        break;
      default:
        throw new Error('알 수 없는 세차 모드');
    }
    this.remainingTime = this.totalTime;
    this.washStartTime = Date.now();
    await this.client.writeCoil(address, true);
    console.log(`FL3.0 세차기 ${mode} 모드 시작 명령 전송`);
    this.startWashTimer();
  }

  startWashTimer() {
    if (this.washTimer) {
      clearInterval(this.washTimer);
    }
    this.washTimer = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - this.washStartTime) / 1000);
      this.remainingTime = Math.max(0, this.totalTime - elapsedTime);
      if (this.remainingTime === 0) {
        clearInterval(this.washTimer);
        this.washTimer = null;
      }
    }, 1000);
  }

  async reset() {
    try {
      await this.client.writeCoil(0x00CF, true);
      console.log('FL3.0 세차기 리셋 명령 전송');
    } catch (error) {
      console.error('리셋 명령 전송 중 오류:', error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.client.writeCoil(0x00CE, true);
      console.log('FL3.0 세차기 정지 명령 전송');
      this.remainingTime = 0;
      this.totalTime = 0;
      this.currentMode = null;
      this.washStartTime = null;
      if (this.washTimer) {
        clearInterval(this.washTimer);
        this.washTimer = null;
      }
    } catch (error) {
      console.error('정지 명령 전송 중 오류:', error);
      throw error;
    }
  }

  async status() {
    try {
      const result = await this.client.readHoldingRegisters(0x0064, 1); // D100 읽기
      const processStatus = result.data[0];

      const isRunning = processStatus !== 0;
      const isError = await this.checkErrorStatus();

      return {
        running: isRunning,
        error: isError,
        processStatus,
      };
    } catch (error) {
      console.error('Error getting FL30 status:', error);
      throw error;
    }
  }

  async getState() {
    console.log('getState 시작');
    const status = await this.status();
    console.log('status 완료:', status);
    const elapsedTime = this.washStartTime ? Math.floor((Date.now() - this.washStartTime) / 1000) : 0;
    const remainingTime = Math.max(0, this.totalTime - elapsedTime);
    const progress = this.totalTime > 0 ? Math.min(100, Math.round((elapsedTime / this.totalTime) * 100)) : 0;
    
    const currentStep = this.interpretProcessStatus(status.processStatus);
    const isWashing = currentStep !== '대기 중';
    const isAvailable = !isWashing && status.processStatus === 0;
    
    console.log('getState 완료');
    return {
      isAvailable,
      isWashing,
      running: status.running,
      error: status.error,
      remainingTime,
      remainingPercent: 100 - progress,
      progress,
      currentStep,
      currentMode: this.currentMode,
      errorDetails: await this.getErrorDetails()
    };
  }

  interpretProcessStatus(status) {
    switch (status) {
      case 0: return '기계 대기 중';
      case 1: return '세차 종료';
      case 2: return '무브러시 세차 중';
      case 3: return '거품 분사 중';
      case 4: return '왁스 분사 중';
      case 5: return '건조 중';
      case 6: return '고압 물 분사 중';
      case 7: return '하부 분사 중';
      case 8: return '무브러시 세차 완료, 대기 중';
      case 9: return '거품 분사 완료, 브러시 대기 중';
      case 10: return '결제 성공';
      default: return '알 수 없는 상태';
    }
  }

  async getCurrentProcess() {
    const status = await this.status();
    return this.interpretProcessStatus(status.processStatus);
  }

  getLastProcess() {
    return '건조 중';
  }

  async checkErrorStatus() {
    try {
      const result = await this.client.readCoils(0x011D, 1); // M285 읽기
      return result.data[0];
    } catch (error) {
      console.error('에러 상태 확인 중 오류:', error);
      throw error;
    }
  }

  async isWashingComplete() {
    const result = await this.client.readCoils(0x0088, 1); // M136 읽기
    return result.data[0];
  }

  async isRunning() {
    const result = await this.client.readCoils(0x0025, 1); // M37 읽기
    return result.data[0];
  }

  async reconnect() {
    console.log('연결 재시도 중...');
    try {
      await this.client.close();
      await this.initialize();
      console.log('재연결 성공');
    } catch (error) {
      console.error('재연결 실패:', error);
      throw error;
    }
  }

  async getErrorDetails() {
    try {
      const isError = await this.checkErrorStatus();
      if (isError) {
        // 여기에 추가적인 에러 세부 정보를 읽는 로직을 구현할 수 있습니다.
        // 예를 들어, 다른 레지스터를 읽어 구체적인 에러 코드를 확인할 수 있습니다.
        return "기계 이상 상태 발생";
      } else {
        return "정상 상태";
      }
    } catch (error) {
      console.error('에러 세부 정보 확인 중 오류:', error);
      throw error;
    }
  }
}

module.exports = FL30CarWash;
