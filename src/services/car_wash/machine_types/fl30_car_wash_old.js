import AbstractCarWashMachine from '../abstract_car_wash_machine.js';
import ModbusRTU from 'modbus-serial';
import EventEmitter from 'events';

class FL30CarWashOld extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.client = new ModbusRTU();
    this.address = 0x0c; // FL3.0의 주소 (12)
    this.hasDetailedState = true;
    this.eventEmitter = new EventEmitter();
    this.updateInterval = null;
    this.totalTime = 0;
    this.remainingTime = 0;
    this.currentMode = null;
    this.washTimer = null;
    this.washStartTime = null;
  }

  async initialize() {
    await this.client.connectAsciiSerial(this.config.portName, {
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even',
    });
    this.client.setTimeout(3000);
    this.client.setID(this.address);
    console.log('FL3.0 세차기 초기화 완료');
    this.startStateUpdates();
  }

  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  startStateUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        const state = await this.getState();
        this.eventEmitter.emit('stateUpdate', state);

        // 세차 완료 확인 (하지만 업데이트는 계속 유지)
        if (state.isAvailable && !state.isWashing) {
          console.log('세차 완료.');
        }
      } catch (error) {
        console.error('상태 업데이트 중 오류:', error);
      }
    }, 1000);
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
        address = 0x012f; // 간단 세차
        this.totalTime = 8 * 60; // 8분
        break;
      case 'MODE2':
        address = 0x012e; // 정밀 세차
        this.totalTime = 12 * 60; // 12분
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
        this.stop();
      }
    }, 1000);
  }

  async stop() {
    await this.client.writeCoil(0x0005, true);
    console.log('FL3.0 세차기 정지(리셋) 명령 전송');
    this.remainingTime = 0;
    this.totalTime = 0;
    this.currentMode = null;
    this.washStartTime = null;
    if (this.washTimer) {
      clearInterval(this.washTimer);
      this.washTimer = null;
    }
  }

  async status() {
    try {
      const result = await this.client.readHoldingRegisters(0x000a, 1); // D10
      const processStatus = result.data[0];

      const isRunning = processStatus !== 0;
      const carStopped = await this.checkCarStoppedStatus();

      return {
        running: isRunning,
        carStopped,
        error: processStatus === 99, // 예: 99를 오류 상태로 가정
        processStatus,
      };
    } catch (error) {
      console.error('Error getting FL30 status:', error);
      throw error;
    }
  }

  async getState() {
    const status = await this.status();
    const elapsedTime = this.washStartTime
      ? Math.floor((Date.now() - this.washStartTime) / 1000)
      : 0;
    const remainingTime = Math.max(0, this.totalTime - elapsedTime);
    const progress =
      this.totalTime > 0 ? Math.min(100, Math.round((elapsedTime / this.totalTime) * 100)) : 0;

    const currentStep = this.interpretProcessStatus(status.processStatus);
    const isWashing = currentStep !== '대기 중';
    const isAvailable = !isWashing && status.processStatus === 0;

    return {
      isAvailable,
      isWashing,
      running: status.running,
      carStopped: status.carStopped,
      error: status.error,
      remainingTime,
      remainingPercent: 100 - progress,
      progress,
      currentStep,
      currentMode: this.currentMode,
    };
  }

  interpretProcessStatus(status) {
    switch (status) {
      case 0:
        return '대기 중';
      case 1:
        return '무세제 세차';
      case 2:
        return '거품';
      case 3:
        return '세척';
      case 4:
        return '왁스';
      case 5:
        return '건조';
      default:
        return '알 수 없는 상태';
    }
  }

  async getCurrentProcess() {
    const status = await this.status();
    return this.interpretProcessStatus(status.processStatus);
  }

  getLastProcess() {
    return '건조'; // 항상 마지막 프로세스는 '건조'입니다.
  }

  async reset() {
    await this.client.writeCoil(0x0005, true);
    console.log('FL3.0 세차기 리셋 명령 전송');
  }

  async checkOriginStatus() {
    const result = await this.client.readCoils(0x0015, 4); // M21, M22, M24 읽기
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
    const result = await this.client.readCoils(0x000f, 1); // M15
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
}

export default FL30CarWashOld;
