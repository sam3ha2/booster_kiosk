class AbstractCarWashMachine {
  constructor(serialPort, config) {
    this.serialPort = serialPort;
    this.config = config;
  }

  async initialize() {
    throw new Error('initialize method must be implemented');
  }

  async start() {
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
      this.serialPort.write(command + '\n', (err) => {
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
}

module.exports = AbstractCarWashMachine;