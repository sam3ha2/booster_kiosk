const AbstractCarWashMachine = require('../abstract_car_wash_machine');

class SG90CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.address = '01'; // SG90의 주소
  }

  getSerialConfig() {
    return {
      path: this.config.portName,
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even'
    };
  }

  async initialize() {
    await super.initialize();
    console.log('SG90 세차기 초기화 완료');
  }

  async start(mode) {
    const commands = {
      1: '3A 30 31 30 35 30 39 30 35 46 46 30 30 45 44 0D 0A',
      2: '3A 30 31 30 35 30 39 30 36 46 46 30 30 45 43 0D 0A',
      3: '3A 30 31 30 35 30 39 30 34 46 46 30 30 45 45 0D 0A',
      4: '3A 30 31 30 35 30 39 30 38 46 46 30 30 45 41 0D 0A'
    };
    await this.sendCommand(commands[mode]);
    console.log(`SG90 세차기 모드 ${mode} 시작`);
  }

  async stop() {
    await this.sendCommand('3A 30 31 30 35 30 38 33 43 46 46 30 30 42 37 0D 0A');
    console.log('SG90 세차기 정지');
  }

  async status() {
    return await this.checkOperationStatus();
  }

  async pause() {
    await this.sendCommand('3A 30 31 30 35 30 38 34 37 46 46 30 30 41 43 0D 0A');
    console.log('SG90 세차기 일시 정지');
  }

  async resume() {
    await this.sendCommand('3A 30 31 30 35 30 38 34 37 30 30 30 30 41 42 0D 0A');
    console.log('SG90 세차기 재개');
  }

  async reset() {
    await this.sendCommand('3A 30 31 30 35 30 38 32 30 46 46 30 30 44 33 0D 0A');
    console.log('SG90 세차기 리셋');
  }

  async checkCarPresence() {
    await this.sendCommand('3A 30 31 30 31 30 41 46 30 30 30 30 31 30 33 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkReadyForNextWash() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkCarEntryStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 36 36 30 30 30 31 38 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkOperationStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkErrorStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 39 30 30 30 31 31 43 0D 0A');
    // 응답 처리 로직 필요
  }

  async getTotalWashCount() {
    await this.sendCommand('3A 30 31 30 33 31 39 46 36 30 30 30 31 45 43 0D 0A');
    // 응답 처리 로직 필요
  }

  async getDailyWashCount() {
    await this.sendCommand('3A 30 31 30 33 31 39 46 38 30 30 30 31 45');
    // 응답 처리 로직 필요
  }

  onDataReceived(data) {
    console.log('SG90 세차기로부터 데이터 수신:', data);
    // 여기서 데이터를 파싱하고 필요한 작업을 수행합니다.
  }
}

module.exports = SG90CarWash;