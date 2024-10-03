const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class AbstractCarWashMachine {
  constructor(config) {
    this.config = config;
    this.serialPort = null;
    this.parser = null;
  }

  async initialize() {
    this.serialPort = new SerialPort(this.getSerialConfig());
    this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    this.serialPort.on('open', () => {
      console.log(`시리얼 포트 ${this.config.portName}가 열렸습니다.`);
    });

    this.serialPort.on('error', (err) => {
      console.error(`시리얼 포트 ${this.config.portName} 오류:`, err);
    });

    this.parser.on('data', this.onDataReceived.bind(this));

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

  async pause() {
    throw new Error('pause method must be implemented');
  }

  async resume() {
    throw new Error('resume method must be implemented');
  }

  async reset() {
    throw new Error('reset method must be implemented');
  }

  async checkCarPresence() {
    throw new Error('checkCarPresence method must be implemented');
  }

  async checkReadyForNextWash() {
    throw new Error('checkReadyForNextWash method must be implemented');
  }

  async checkCarEntryStatus() {
    throw new Error('checkCarEntryStatus method must be implemented');
  }

  async checkOperationStatus() {
    throw new Error('checkOperationStatus method must be implemented');
  }

  async checkErrorStatus() {
    throw new Error('checkErrorStatus method must be implemented');
  }

  async getTotalWashCount() {
    throw new Error('getTotalWashCount method must be implemented');
  }

  async getDailyWashCount() {
    throw new Error('getDailyWashCount method must be implemented');
  }
}

module.exports = AbstractCarWashMachine;