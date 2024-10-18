const { SerialPort } = require('serialport');

class FL30Simulator {
  constructor(portName) {
    this.portName = portName;
    this.status = 'idle';
    this.currentProcess = 0;
    this.errorStatus = false;
    this.carPresent = false;
    this.coils = new Array(286).fill(false);
    this.registers = new Array(101).fill(0);
    this.port = new SerialPort({ path: portName, baudRate: 9600, parity: 'even', stopBits: 1, dataBits: 8 });
    this.washTimer = null;
    this.washStatus = 'idle';
    this.currentMode = null;
    this.washSteps = [
      { step: 10, description: '결제 성공' },
      { step: 2, description: '무브러시 세차 중' },
      { step: 3, description: '거품 분사 중' },
      { step: 6, description: '고압 물 분사 중' },
      { step: 7, description: '하부 분사 중' },
      { step: 4, description: '왁스 분사 중' },
      { step: 5, description: '건조 중' },
      { step: 1, description: '세차 종료' }
    ];
    this.currentStepIndex = 0;
  }

  initialize() {
    this.port.on('open', () => {
      console.log("[Simulator] FL3.0 시뮬레이터가 초기화되었습니다.");
    });

    this.port.on('data', (data) => {
      // 50% 확률로 데이터 누락 시뮬레이션
      if (Math.random() < 0.5) {
        this.onDataReceived(data);
      } else {
        console.log("[Simulator] 데이터 누락 시뮬레이션");
      }
    });

    this.port.on('error', (err) => {
      console.error(`[Simulator] 포트 오류 발생: ${err.message}`);
    });

    // 초기 상태 설정
    this.setCoil(37, false); // M37 (기계 작동 중이 아님)
    this.setCoil(285, false); // M285 (기계 정상 상태)
    this.setRegister(100, 0); // D100 (기계 대기 중)
    console.log("[Simulator] 초기 상태 설정 완료");
  }

  onDataReceived(data) {
    console.log("[Simulator] 원시 데이터 수신:", data.toString('hex'));
    const request = this.parseModbusASCII(data.toString('hex'));
    console.log("[Simulator] 파싱된 요청:", request);
    if (request) {
      this.handleRequest(request);
    }
  }

  parseModbusASCII(data) {
    if (data.toUpperCase().startsWith('3A')) {
      const content = data.slice(2, -4); // LRC와 CRLF 제거
      const bytes = [];
      for (let i = 0; i < content.length; i += 2) {
        bytes.push(parseInt(content.substr(i, 2), 16));
      }
      return bytes;
    }
    return null;
  }

  handleRequest(request) {
    const slaveId = request[0];
    const functionCode = request[1];
    const startAddress = (request[2] << 8) | request[3];
    const quantity = (request[4] << 8) | request[5];

    console.log(`[Simulator] 요청 수신 - Slave ID: ${slaveId}, 기능 코드: ${functionCode}, 시작 주소: ${startAddress}, 수량: ${quantity}`);

    let response;
    switch (functionCode) {
      case 1: // Read Coils
        response = this.handleReadCoils(slaveId, startAddress, quantity);
        break;
      case 3: // Read Holding Registers
        response = this.handleReadHoldingRegisters(slaveId, startAddress, quantity);
        break;
      case 5: // Write Single Coil
        response = this.handleWriteCoil(slaveId, startAddress, request[4] === 0xFF);
        break;
      default:
        console.log("[Simulator] 지원하지 않는 기능 코드:", functionCode);
        return;
    }

    this.sendResponse(response);
  }

  handleReadCoils(slaveId, startAddress, quantity) {
    const coilValues = this.coils.slice(startAddress, startAddress + quantity);
    const byteCount = Math.ceil(quantity / 8);
    const responseData = new Array(byteCount).fill(0);
    
    coilValues.forEach((value, index) => {
      if (value) {
        responseData[Math.floor(index / 8)] |= (1 << (index % 8));
      }
    });

    return [slaveId, 0x01, byteCount, ...responseData];
  }

  handleReadHoldingRegisters(slaveId, startAddress, quantity) {
    const registerValues = this.registers.slice(startAddress, startAddress + quantity);
    const responseData = [slaveId, 0x03, quantity * 2];
    registerValues.forEach(value => {
      responseData.push((value >> 8) & 0xFF);
      responseData.push(value & 0xFF);
    });
    return responseData;
  }

  handleWriteCoil(slaveId, address, value) {
    this.setCoil(address, value);
    
    // 세차 시작 신호 처리
    if ((address === 208 || address === 209) && value) {
      if (this.registers[100] === 0 || this.registers[100] === 1) {
        this.startWash(address === 208 ? '정밀' : '빠른');
      } else {
        console.log("[Simulator] 세차 시작 무시: 대기 중이나 종료 상태가 아님");
      }
    }
    
    // 복위(Reset) 또는 정지 명령 처리
    if ((address === 207 || address === 206) && value) {
      if (this.registers[100] === 0 || this.registers[100] === 1) {
        this.stopWash();
      } else {
        console.log("[Simulator] 복위/정지 명령 무시: 대기 중이나 종료 상태가 아님");
      }
    }

    return [slaveId, 0x05, (address >> 8) & 0xFF, address & 0xFF, value ? 0xFF : 0x00, 0x00];
  }

  sendResponse(response) {
    const asciiResponse = this.createModbusASCIIResponse(response);
    console.log("[Simulator] 응답 전송:", asciiResponse.toString('ascii'));
    this.port.write(asciiResponse, (err) => {
      if (err) {
        console.error(`[Simulator] 응답 전송 중 오류 발생: ${err.message}`);
      }
    });
  }

  createModbusASCIIResponse(data) {
    let lrc = data.reduce((a, b) => a + b, 0);
    lrc = ((lrc ^ 0xFF) + 1) & 0xFF;
    data.push(lrc);

    const ascii = ':' + data.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('') + '\r\n';
    return Buffer.from(ascii, 'ascii');
  }

  setCoil(address, value) {
    const prevValue = this.coils[address];
    this.coils[address] = value;
    if (prevValue !== value) {
      console.log(`[Simulator] 코일 M${address} 변경: ${prevValue} -> ${value}`);
    }
    this.updateStatus();
  }

  setRegister(address, value) {
    const prevValue = this.registers[address];
    this.registers[address] = value;
    if (prevValue !== value) {
      console.log(`[Simulator] 레지스터 D${address} 변경: ${prevValue} -> ${value}`);
    }
    this.updateStatus();
  }

  updateStatus() {
    const prevStatus = this.status;
    const prevErrorStatus = this.errorStatus;
    const prevCurrentProcess = this.currentProcess;

    const m37 = this.coils[37];
    const m285 = this.coils[285];
    const d100 = this.registers[100];

    if (m37) {
      this.status = 'running';
    } else {
      this.status = 'idle';
    }

    this.errorStatus = m285;
    this.currentProcess = d100;

    // 상태 변화 출력
    if (this.status !== prevStatus) {
      console.log(`[Simulator] 상태 변경: ${prevStatus} -> ${this.status}`);
    }
    if (this.errorStatus !== prevErrorStatus) {
      console.log(`[Simulator] 오류 상태 변경: ${prevErrorStatus} -> ${this.errorStatus}`);
    }
    if (this.currentProcess !== prevCurrentProcess) {
      console.log(`[Simulator] 현재 프로세스 변경: ${prevCurrentProcess} -> ${this.currentProcess}`);
    }
  }

  startWash(mode) {
    console.log(`[Simulator] 세차 시작: ${mode} 모드`);
    this.washStatus = 'running';
    this.currentMode = mode;
    this.setCoil(37, true); // M37 (기계 작동 중)
    this.currentStepIndex = 0;
    this.setRegister(100, this.washSteps[this.currentStepIndex].step); // D100 (결제 성공)
    this.startWashProcess();
  }

  startWashProcess() {
    if (this.washTimer) return;
    console.log('[Simulator] 세차 프로세스 시작');
    this.washTimer = setInterval(() => {
      this.currentStepIndex++;
      if (this.currentStepIndex < this.washSteps.length) {
        const currentStep = this.washSteps[this.currentStepIndex];
        this.setRegister(100, currentStep.step);
        console.log(`[Simulator] 현재 단계: ${currentStep.description}`);
      } else {
        this.stopWashProcess();
        this.finishWash();
      }
    }, 5000); // 5초마다 프로세스 변경 (테스트용, 실제로는 더 긴 시간으로 설정)
  }

  stopWashProcess() {
    if (this.washTimer) {
      clearInterval(this.washTimer);
      this.washTimer = null;
    }
  }

  finishWash() {
    console.log('[Simulator] 세차 완료');
    this.washStatus = 'idle';
    this.currentMode = null;
    this.setCoil(37, false); // M37 (기계 작동 중이 아님)
    this.setCoil(136, true); // M136 (세차 종료)
    this.setRegister(100, 1); // D100 (세차 종료)
    
    this.status = 'idle';

    setTimeout(() => {
      if (this.registers[100] === 1) {
        console.log('[Simulator] 5초 후 자동 리셋');
        this.setRegister(100, 0); // D100 (기계 대기 중)
      }
    }, 5000);
  }

  stopWash() {
    console.log('[Simulator] 세차 정지');
    this.washStatus = 'idle';
    this.stopWashProcess();
    this.setCoil(37, false); // M37 (기계 작동 중이 아님)
    this.setRegister(100, 0); // D100 (기계 대기 중)
    this.status = 'idle';
  }

  close() {
    return new Promise((resolve) => {
      this.port.close(() => {
        console.log("[Simulator] 포트가 닫혔습니다.");
        resolve();
      });
    });
  }
}

module.exports = FL30Simulator;

// 시뮬레이터를 독립적으로 실행할 수 있는 코드
if (require.main === module) {
  const simulator = new FL30Simulator(process.env.SIMULATOR_PORT_NAME || '/dev/ttys013');
  simulator.initialize();
  console.log('FL3.0 시뮬레이터가 실행되었습니다.');

  // 정상 종료를 위한 이벤트 리스너 추가
  process.on('SIGINT', async () => {
    console.log('시뮬레이터를 종료합니다...');
    await simulator.close();
    process.exit(0);
  });
}
