const AbstractCarWashMachine = require('../abstract_car_wash_machine');

class TypeACarWash extends AbstractCarWashMachine {
  constructor(serialPort, config) {
    super(serialPort, config);
    this.status = 'idle';
  }

  async initialize() {
    await this.sendCommand(this.config.initCommand);
    console.log('Type A 세차기 초기화 완료');
  }

  async start() {
    await this.sendCommand(this.config.startCommand);
    this.status = 'running';
    console.log('Type A 세차기 시작');
  }

  async stop() {
    await this.sendCommand(this.config.stopCommand);
    this.status = 'idle';
    console.log('Type A 세차기 정지');
  }

  async status() {
    return this.status;
  }

  onDataReceived(data) {
    console.log('Type A 세차기로부터 데이터 수신:', data);
    // 여기서 데이터를 파싱하고 필요한 작업을 수행합니다.
  }
}

module.exports = TypeACarWash;