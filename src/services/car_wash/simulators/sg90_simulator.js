const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline');

class SG90Simulator {
  isNotifyChanged = true;

  constructor(portName) {
    this.portName = portName;
    this.status = 'idle';
    this.totalWashCount = 0;
    this.dailyWashCount = 0;
    this.currentMode = null;
    this.errorStatus = false;
    this.carPresent = false;

    this.serialPort = new SerialPort({
      path: portName,
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even'
    });

    this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    this.serialPort.on('open', () => {
      console.log('시리얼 포트가 열렸습니다.');
    });

    this.parser.on('data', (data) => {
      this.handleCommand(data);
    });
  }

  handleCommand(command) {
    console.log('받은 명령:', command);
    if (command === '3A 30 31 30 35 30 39 30 35 46 46 30 30 45 44 0D 0A') {
      this.startWash(1);
    } else if (command === '3A 30 31 30 35 30 39 30 36 46 46 30 30 45 43 0D 0A') {
      this.startWash(2);
    } else if (command === '3A 30 31 30 35 30 39 30 34 46 46 30 30 45 45 0D 0A') {
      this.startWash(3);
    } else if (command === '3A 30 31 30 35 30 39 30 38 46 46 30 30 45 41 0D 0A') {
      this.startWash(4);
    } else if (command === '3A 30 31 30 35 30 38 33 43 46 46 30 30 42 37 0D 0A') {
      this.stopWash();
    } else if (command === '3A 30 31 30 35 30 38 34 37 46 46 30 30 41 43 0D 0A') {
      this.pauseWash();
    } else if (command === '3A 30 31 30 35 30 38 34 37 30 30 30 30 41 42 0D 0A') {
      this.resumeWash();
    } else if (command === '3A 30 31 30 35 30 38 32 30 46 46 30 30 44 33 0D 0A') {
      this.resetWash();
    } else if (command === '3A 30 31 30 31 30 41 46 30 30 30 30 31 30 33 0D 0A') {
      this.checkCarPresence();
    } else if (command === '3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A') {
      this.checkOperationStatus();
    } else if (command === '3A 30 31 30 31 30 38 44 39 30 30 30 31 31 43 0D 0A') {
      this.checkErrorStatus();
    } else if (command === '3A 30 31 30 31 30 38 36 36 30 30 30 31 38 46 0D 0A') {
      this.checkCarEntryStatus();
    } else if (command === '3A 30 31 30 33 31 39 46 36 30 30 30 31 45 43 0D 0A') {
      this.getTotalWashCount();
    } else if (command === '3A 30 31 30 33 31 39 46 38 30 30 30 31 45 41 0D 0A') {
      this.getDailyWashCount();
    } else {
      console.log('지원하지 않는 명령:', command);
    }
  }

  startWash(mode) {
    this.status = 'running';
    this.currentMode = mode;
    if (this.isNotifyChanged) {
      this.sendResponse('3A 30 31 30 35 30 39 30 35 46 46 30 30 45 44 0D 0A');
    }

    setTimeout(() => {
      this.status = 'idle';
      this.currentMode = null;
      this.totalWashCount++;
      this.dailyWashCount++;
    }, 5000);
  }

  stopWash() {
    this.status = 'idle';
    this.currentMode = null;
    if (this.isNotifyChanged) {
      this.sendResponse('3A 30 31 30 35 30 38 33 43 46 46 30 30 42 37 0D 0A');
    }
  }

  pauseWash() {
    this.status = 'paused';
    if (this.isNotifyChanged) {
      this.sendResponse('3A 30 31 30 35 30 38 34 37 46 46 30 30 41 43 0D 0A');
    }
  }

  resumeWash() {
    this.status = 'running';
    if (this.isNotifyChanged) {
      this.sendResponse('3A 30 31 30 35 30 38 34 37 30 30 30 30 41 42 0D 0A');
    }
  }

  resetWash() {
    this.status = 'idle';
    this.currentMode = null;
    this.errorStatus = false;
    if (this.isNotifyChanged) {
      this.sendResponse('3A 30 31 30 35 30 38 32 30 46 46 30 30 44 33 0D 0A');
    }
  }

  checkCarPresence() {
    const response = this.carPresent ? '3A 30 31 30 31 30 31 46 31 30 43 0D 0A' : '3A 30 31 30 31 46 30 30 44 0D 0A';
    this.sendResponse(response);
  }

  checkOperationStatus() {
    const response = this.status === 'running' ? '3A 30 31 30 31 30 31 44 37 32 36 0D 0A' : '3A 30 31 30 31 30 31 44 36 32 37 0D 0A';
    this.sendResponse(response);
  }

  checkErrorStatus() {
    const response = this.errorStatus ? '3A 30 31 30 31 30 31 44 39 32 34 0D 0A' : '3A 30 31 30 31 30 31 44 38 32 35 0D 0A';
    this.sendResponse(response);
  }

  checkCarEntryStatus() {
    const response = this.carPresent ? '3A 30 31 30 31 30 31 36 37 39 36 0D 0A' : '3A 30 31 30 31 30 31 36 36 39 37 0D 0A';
    this.sendResponse(response);
  }

  getTotalWashCount() {
    const data1 = Math.floor(this.totalWashCount / 256);
    const data2 = this.totalWashCount % 256;
    const countHex = data1.toString(16).padStart(2, '0') + data2.toString(16).padStart(2, '0');
    const response = `3A 30 31 30 33 30 32 ${countHex.substr(0, 2)} ${countHex.substr(2, 2)} 46 41 0D 0A`;
    this.sendResponse(response);
  }

  getDailyWashCount() {
    const data1 = Math.floor(this.dailyWashCount / 256);
    const data2 = this.dailyWashCount % 256;
    const countHex = data1.toString(16).padStart(2, '0') + data2.toString(16).padStart(2, '0');
    const response = `3A 30 31 30 33 30 32 ${countHex.substr(0, 2)} ${countHex.substr(2, 2)} 46 41 0D 0A`;
    this.sendResponse(response);
  }

  sendResponse(response) {
    this.serialPort.write(response + '\r\n', (err) => {
      if (err) {
        console.error('응답 전송 오류:', err);
      } else {
        console.log('전송된 응답:', response);
      }
    });
  }

  // 시뮬레이터 제어를 위한 추가 메서드들
  setCarPresence(present) {
    this.carPresent = present;
  }

  setErrorStatus(error) {
    this.errorStatus = error;
  }

  resetCounts() {
    this.totalWashCount = 0;
    this.dailyWashCount = 0;
  }
}

module.exports = SG90Simulator;