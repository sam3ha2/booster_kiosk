const { SerialPort } = require('serialport');

class AbstractCarWashMachine {
  constructor(config) {
    this.config = config;
    this.serialPort = null;
  }

  async initialize() {
    this.serialPort = new SerialPort(this.getSerialConfig());

    this.serialPort.on('open', () => {
      console.log(`시리얼 포트 ${this.config.portName}가 열렸습니다.`);
    });

    this.serialPort.on('error', (err) => {
      console.error(`시리얼 포트 ${this.config.portName} 오류:`, err);
    });

    this.serialPort.on('data', this.onDataReceived.bind(this));

    // 추가적인 초기화 로직
  }

  getSerialConfig() {
    throw new Error('getSerialConfig method must be implemented');
  }

  async start(mode) {
    throw new Error('start method must be implemented');
  }

  async stop() {
    throw new Error('stop method must be implemented');
  }

  async status() {
    throw new Error('status method must be implemented');
  }

  async sendCommand(command) {
    console.log(`${command}`)
    return new Promise((resolve, reject) => {
      this.serialPort.write(command, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  onDataReceived(data) {
    throw new Error('onDataReceived method must be implemented');
  }

  // 다른 메서드들은 그대로 유지...
}

module.exports = AbstractCarWashMachine;