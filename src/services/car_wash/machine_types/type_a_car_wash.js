import AbstractCarWashMachine from '../abstract_car_wash_machine.js';

class TypeACarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.status = 'idle';
  }

  getSerialConfig() {
    return {
      path: this.config.portName,
      baudRate: 115200, // 예시로 다른 baudRate를 사용
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    };
  }

  async initialize() {
    await super.initialize();
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

export default TypeACarWash;
