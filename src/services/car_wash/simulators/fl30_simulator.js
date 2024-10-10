const { SerialPort } = require('serialport');

class FL30Simulator {
  constructor(portName) {
    this.portName = portName;
    this.status = 'idle';
    this.currentProcess = 0;
    this.errorStatus = false;
    this.carPresent = false;
    this.coils = new Array(256).fill(false);
    this.registers = new Array(256).fill(0);
    this.port = new SerialPort({ path: portName, baudRate: 9600 });
    this.washTimer = null;
    this.washStatus = 'idle';
    this.currentMode = null;
    this.processes = {
      MODE1: ['무세제 세차', '거품', '세척', '건조'],
      MODE2: ['무세제 세차', '거품', '세척', '왁스', '건조']
    };
    this.currentProcessIndex = -1;
    this.totalTime = 0;
    this.remainingTime = 0;
  }

  initialize() {
    this.port.on('open', () => {
      console.log("[Simulator] FL3.0 시뮬레이터가 초기화되었습니다.");
    });

    this.port.on('data', (data) => this.onDataReceived(data));

    this.port.on('error', (err) => {
      console.error(`[Simulator] 포트 오류 발생: ${err.message}`);
    });

    // 초기 상태 설정
    this.setCoil(0x0015, true); // M21
    this.setCoil(0x0016, true); // M22
    this.setCoil(0x0018, true); // M24
    this.setCoil(0x0093, true); // M147 (at origin)
    this.setRegister(0x000A, 0); // D10 (current process)
    console.log("[Simulator] 초기 상태 설정 완료");
  }

  onDataReceived(data) {
    console.log("[Simulator] 원시 데이터 수신:", data.toString('ascii'));
    const requests = this.splitRequests(data.toString('ascii'));
    requests.forEach(request => {
      const parsedRequest = this.parseModbusASCII(request);
      if (parsedRequest) {
        console.log("[Simulator] 파싱된 요청:", parsedRequest);
        this.handleRequest(parsedRequest);
      }
    });
  }

  splitRequests(data) {
    return data.split('\r\n').filter(req => req.startsWith(':') && req.length > 0);
  }

  parseModbusASCII(data) {
    if (data.startsWith(':')) {
      const content = data.slice(1);
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
        response = this.handleReadCoils(startAddress, quantity);
        break;
      case 3: // Read Holding Registers
        response = this.handleReadHoldingRegisters(startAddress, quantity);
        break;
      case 5: // Write Single Coil
        response = this.handleWriteCoil(startAddress, request[4] === 0xFF);
        break;
      case 6: // Write Single Register
        response = this.handleWriteRegister(startAddress, (request[4] << 8) | request[5]);
        break;
      default:
        console.log("[Simulator] 지원하지 않는 기능 코드:", functionCode);
        return;
    }

    this.sendResponse(response);
  }

  handleReadCoils(startAddress, quantity) {
    const coilValues = this.coils.slice(startAddress, startAddress + quantity);
    const byteCount = Math.ceil(quantity / 8);
    const responseData = new Array(byteCount).fill(0);
    
    coilValues.forEach((value, index) => {
      if (value) {
        responseData[Math.floor(index / 8)] |= (1 << (index % 8));
      }
    });

    return [0x0C, 0x01, byteCount, ...responseData];
  }

  handleReadHoldingRegisters(startAddress, quantity) {
    const registerValues = this.registers.slice(startAddress, startAddress + quantity);
    const responseData = [0x0C, 0x03, quantity * 2];
    registerValues.forEach(value => {
      responseData.push((value >> 8) & 0xFF);
      responseData.push(value & 0xFF);
    });
    return responseData;
  }

  handleWriteCoil(address, value) {
    this.setCoil(address, value);
    
    // 세차 시작 신호 처리
    if ((address === 0x012E || address === 0x012F) && value) {
      if (this.washStatus === 'idle') {
        this.startWash(address === 0x012E ? 'MODE2' : 'MODE1');
      } else {
        console.log('[Simulator] 세차가 이미 진행 중입니다. 새로운 세차 요청을 무시합니다.');
      }
    }
    
    // 세차 정지(리셋) 신호 처리
    if (address === 0x0005 && value) {
      this.stopWash();
    }

    return [0x0C, 0x05, (address >> 8) & 0xFF, address & 0xFF, value ? 0xFF : 0x00, 0x00];
  }

  handleWriteRegister(address, value) {
    this.setRegister(address, value);
    return [0x0C, 0x06, (address >> 8) & 0xFF, address & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
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
      console.log(`[Simulator] 코일 ${address.toString(16)} 변경: ${prevValue} -> ${value}`);
    }
    this.updateStatus();
  }

  setRegister(address, value) {
    const prevValue = this.registers[address];
    this.registers[address] = value;
    if (prevValue !== value) {
      console.log(`[Simulator] 레지스터 ${address.toString(16)} 변경: ${prevValue} -> ${value}`);
    }
    this.updateStatus();
  }

  updateStatus() {
    const prevStatus = this.status;
    const prevCarPresent = this.carPresent;
    const prevErrorStatus = this.errorStatus;
    const prevCurrentProcess = this.currentProcess;
    const prevWashStatus = this.washStatus;

    const m21 = this.coils[0x0015];
    const m22 = this.coils[0x0016];
    const m24 = this.coils[0x0018];
    const m13 = this.coils[0x000D];
    const m14 = this.coils[0x000E];
    const m146 = this.coils[0x0092];
    const m147 = this.coils[0x0093];
    const m17 = this.coils[0x0011];
    const m15 = this.coils[0x000F];
    const m16 = this.coils[0x0010];
    const m18 = this.coils[0x0012];

    if (m21 && m22 && m24) {
      if (!m13 && !m14) {
        this.status = 'initial';
      } else {
        this.status = 'origin';
      }
    }

    if (m146) {
      this.status = 'running';
      this.startWashProcess();
    } else if (this.status === 'running') {
      this.stopWashProcess();
    }
    
    if (m147) this.status = 'at_origin';
    if (m17) this.carPresent = true;
    if (m15) this.carPresent = false;
    if (m16) console.log('[Simulator] 차량이 정지 위치를 초과했습니다.');
    if (m18) this.errorStatus = true;

    this.currentProcess = this.registers[0x000A]; // D10 레지스터

    // 상태 변화 출력
    if (this.status !== prevStatus) {
      console.log(`[Simulator] 상태 변경: ${prevStatus} -> ${this.status}`);
    }
    if (this.carPresent !== prevCarPresent) {
      console.log(`[Simulator] 차량 존재 여부 변경: ${prevCarPresent} -> ${this.carPresent}`);
    }
    if (this.errorStatus !== prevErrorStatus) {
      console.log(`[Simulator] 오류 상태 변경: ${prevErrorStatus} -> ${this.errorStatus}`);
    }
    if (this.currentProcess !== prevCurrentProcess) {
      console.log(`[Simulator] 현재 프로세스 변경: ${prevCurrentProcess} -> ${this.currentProcess}`);
    }
    if (this.washStatus !== prevWashStatus) {
      console.log(`[Simulator] 세차 상태 변경: ${prevWashStatus} -> ${this.washStatus}`);
    }
  }

  startWash(mode) {
    console.log(`[Simulator] 세차 시작: ${mode}`);
    this.washStatus = 'running';
    this.currentMode = mode;
    this.currentProcessIndex = 0;
    this.setCoil(0x0092, true); // M146 (running) 설정
    this.setCoil(0x0093, false); // M147 (at origin) 해제
    this.setRegister(0x000A, 1); // D10 초기화 (1: 무세제 세차 시작)
    this.startWashProcess();
  }

  startWashProcess() {
    if (this.washTimer) return;
    console.log('[Simulator] 세차 프로세스 시작');
    this.washTimer = setInterval(() => {
      const processCount = this.processes[this.currentMode].length;
      if (this.currentProcessIndex < processCount - 1) {
        this.currentProcessIndex++;
        this.setRegister(0x000A, this.currentProcessIndex + 1);
        console.log(`[Simulator] 세차 프로세스 진행: ${this.processes[this.currentMode][this.currentProcessIndex]}`);
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
    this.currentProcessIndex = -1;
    this.setCoil(0x0092, false); // M146 (running) 해제
    this.setCoil(0x0093, true);  // M147 (at origin) 설정
    this.setRegister(0x000A, 0); // D10 초기화 (0: 대기 중)
    this.status = 'idle';
  }

  stopWash() {
    console.log('[Simulator] 세차 정지');
    this.washStatus = 'idle';
    this.finishWash();
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
  const simulator = new FL30Simulator(process.env.SIMULATOR_PORT_NAME || '/dev/ttys002');
  simulator.initialize();
  console.log('FL3.0 시뮬레이터가 실행되었습니다.');

  // 정상 종료를 위한 이벤트 리스너 추가
  process.on('SIGINT', async () => {
    console.log('시뮬레이터를 종료합니다...');
    await simulator.close();
    process.exit(0);
  });
}