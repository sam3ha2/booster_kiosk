const ModbusRTU = require('modbus-serial');

class SG90Simulator {
  constructor(portName) {
    this.portName = portName;
    this.status = 'idle';
    this.totalWashCount = 0;
    this.dailyWashCount = 0;
    this.currentMode = null;
    this.errorStatus = false;
    this.carPresent = false;
    this.client = new ModbusRTU();
  }

  async initialize() {
    await this.client.connectAsciiSerial(this.portName, {
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even'
    });
    this.client.setID(1);
    console.log("[Simulator] 시뮬레이터가 초기화되었습니다.");

    // 데이터 수신 이벤트 리스너 추가
    this.client._port.on('data', this.onDataReceived.bind(this));

    // 주기적으로 상태를 업데이트하는 로직
    // setInterval(() => this.updateStatus(), 1000);
  }

  onDataReceived(data) {
    console.log(`[Simulator] 원시 데이터 수신:`, data);
    const hexData = data.toString('hex');
    console.log(`[Simulator] 16진수 데이터: ${hexData}`);
    
    // ASCII 데이터로 변환
    const asciiData = data.toString('ascii');
    console.log(`[Simulator] ASCII 데이터: ${asciiData}`);

    // 여기에서 수신된 데이터를 처리하는 로직을 추가할 수 있습니다.
    this.processReceivedData(asciiData);
  }

  processReceivedData(data) {
    // ':' 로 시작하고 CRLF로 끝나는 완전한 Modbus ASCII 프레임인지 확인
    if (data.startsWith(':') && data.endsWith('\r\n')) {
      const functionCode = data.substr(3, 2);
      const address = parseInt(data.substr(5, 4), 16);
      const value = parseInt(data.substr(9, 4), 16);

      console.log(`[Simulator] 처리: 기능 코드 ${functionCode}, 주소 ${address}, 값 ${value}`);

      // 여기에서 수신된 명령에 따라 적절한 동작을 수행합니다.
      this.handleCommand(parseInt(functionCode, 16), address, value);
    }
  }

  async updateStatus() {
    // console.log(`[Simulator] updateStatus 호출됨: status=${this.status}`);
    // 실제 장치의 동작을 모방하여 상태 업데이트
    if (this.status === 'running') {
      await this.client.writeCoil(0x08D6, true);
    } else {
      await this.client.writeCoil(0x08D6, false);
    }
    await this.client.writeRegister(0x19F6, this.totalWashCount);
    await this.client.writeRegister(0x19F8, this.dailyWashCount);
  }

  async handleCommand(functionCode, address, value) {
    console.log(`[Simulator] 명령 수신: 기능 코드 ${functionCode}, 주소 ${address}, 값 ${value}`);
    switch (functionCode) {
      case 5: // Write Single Coil
        await this.handleWriteCoil(address, value);
        break;
      case 6: // Write Single Register
        await this.handleWriteRegister(address, value);
        break;
      // 다른 기능 코드에 대한 처리를 추가할 수 있습니다.
    }
  }

  async handleWriteCoil(address, value) {
    switch (address) {
      case 0x08D6:
        this.status = value ? 'running' : 'idle';
        break;
      case 0x0AF0:
        this.carPresent = value;
        break;
      case 0x08D9:
        this.errorStatus = value;
        break;
      // 다른 코일 주소에 대한 처리를 추가할 수 있습니다.
    }
  }

  async handleWriteRegister(address, value) {
    switch (address) {
      case 0x0905:
      case 0x0906:
      case 0x0904:
      case 0x0908:
        this.startWash(address);
        break;
      case 0x083C:
        this.stopWash();
        break;
      case 0x0847:
        value === 0xFF00 ? this.pauseWash() : this.resumeWash();
        break;
      case 0x0820:
        this.resetWash();
        break;
      // 다른 레지스터 주소에 대한 처리를 추가할 수 있습니다.
    }
  }

  startWash(mode) {
    this.status = 'running';
    this.currentMode = mode;
    console.log(`[Simulator] 세차 시작: 모드 ${mode.toString(16)}`);

    setTimeout(() => {
      this.status = 'idle';
      this.currentMode = null;
      this.totalWashCount++;
      this.dailyWashCount++;
      console.log('[Simulator] 세차 완료');
    }, 5000);
  }

  stopWash() {
    this.status = 'idle';
    this.currentMode = null;
    console.log('[Simulator] 세차 정지');
  }

  pauseWash() {
    this.status = 'paused';
    console.log('[Simulator] 세차 일시 정지');
  }

  resumeWash() {
    this.status = 'running';
    console.log('[Simulator] 세차 재개');
  }

  resetWash() {
    this.status = 'idle';
    this.currentMode = null;
    this.errorStatus = false;
    console.log('[Simulator] 세차기 리셋');
  }

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

  async close() {
    await this.client.close();
  }
}

module.exports = SG90Simulator;

// 시뮬레이터를 독립적으로 실행할 수 있는 코드
if (require.main === module) {
  const simulator = new SG90Simulator('/dev/ttys002');
  simulator.initialize().then(() => {
    console.log('SG90 시뮬레이터가 실행되었습니다.');
  }).catch((error) => {
    console.error('SG90 시뮬레이터 실행 중 오류 발생:', error);
  });
}