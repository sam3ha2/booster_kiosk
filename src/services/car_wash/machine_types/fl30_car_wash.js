const AbstractCarWashMachine = require('../abstract_car_wash_machine');
const { SerialPort } = require('serialport');
const EventEmitter = require('events');

class FL30CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.port = null;
    this.eventEmitter = new EventEmitter();
    this.address = 0x01;
    this.startCommandInterval = null;
    this.startCommandAttempts = 0;
    this.MAX_START_ATTEMPTS = 30; // 최대 시도 횟수
    this.START_COMMAND_INTERVAL = 1000; // 1초마다 시도
    this.statusCheckInterval = null;
    this.STATUS_CHECK_INTERVAL = 1000; // 1초마다 상태 확인
    this.isWashing = false;
    this.currentStep = '';
  }

  async initialize() {
    try {
      this.port = new SerialPort({
        path: this.config.portName,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'even'
      });

      this.port.on('error', (err) => {
        console.error('시리얼 포트 오류:', err);
        this.eventEmitter.emit('error', err);
      });

      this.port.on('data', (data) => {
        // 데이터 버퍼 초기화 
        this.dataBuffer = this.dataBuffer || Buffer.alloc(0);
        
        // 새로운 데이터를 버퍼에 추가
        this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
        
        // Modbus RTU 프로토콜 패킷 길이 확인 (최소 4바이트: 주소+기능코드+데이터+CRC)
        if (this.dataBuffer.length >= 4) {
          // 기능 코드와 데이터 길이에 따라 전체 패킷 길이 계산
          const functionCode = this.dataBuffer[1];
          let expectedLength;
          
          if (functionCode === 1 || functionCode === 2) {
            // Read Coils/Inputs: 주소(1) + 기능코드(1) + 바이트수(1) + 데이터(n) + CRC(2)
            const byteCount = this.dataBuffer[2];
            expectedLength = 5 + byteCount;
          } else if (functionCode === 3 || functionCode === 4) {
            // Read Holding/Input Registers: 주소(1) + 기능코드(1) + 바이트수(1) + 데이터(n) + CRC(2) 
            const byteCount = this.dataBuffer[2];
            expectedLength = 5 + byteCount;
          } else if (functionCode === 5 || functionCode === 6) {
            // Write Single Coil/Register: 주소(1) + 기능코드(1) + 주소(2) + 값(2) + CRC(2)
            expectedLength = 8;
          }

          if (this.dataBuffer.length >= expectedLength) {
            const completePacket = this.dataBuffer.slice(0, expectedLength);
            this.dataBuffer = this.dataBuffer.slice(expectedLength);
            
            console.log('완성된 패킷 (HEX):', completePacket.toString('hex'));
            this.interpretData(completePacket.toString('hex'));
          }
        }
      });

      await new Promise((resolve) => {
        this.port.on('open', () => {
          console.log('FL3.0 세차기 초기화 완료');
          resolve();
        });
      });
    } catch (error) {
      console.error('FL3.0 세차기 초기화 중 오류:', error);
      throw error;
    }
  }

  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  async start(mode) {
    return new Promise((resolve, reject) => {
      let command;
      switch (mode) {
        case 'MODE1':
          command = '01 05 00 D0 FF 00 8D C3'; // 정밀 세차 모드
          break;
        case 'MODE2':
          command = '01 05 00 D1 FF 00 DC 03'; // 빠른 세차 모드
          break;
        default:
          reject(new Error('알 수 없는 세차 모드'));
          return;
      }
      
      this.startCommandAttempts = 0;
      this.startCommandInterval = setInterval(() => {
        if (this.startCommandAttempts >= this.MAX_START_ATTEMPTS) {
          clearInterval(this.startCommandInterval);
          this.eventEmitter.emit('startFailed');
          return;
        }
        this.sendCommand(command);
        this.startCommandAttempts++;
      }, this.START_COMMAND_INTERVAL);

      const successListener = () => {
        clearInterval(this.startCommandInterval);
        this.eventEmitter.removeListener('startFailed', failureListener);
        resolve({ success: true, message: '세차가 시작되었습니다.' });
      };

      const failureListener = () => {
        clearInterval(this.startCommandInterval);
        this.eventEmitter.removeListener('startSuccess', successListener);
        reject(new Error('세차 시작 실패'));
      };

      this.eventEmitter.once('startSuccess', successListener);
      this.eventEmitter.once('startFailed', failureListener);
    });
  }

  async stop() {
    if (this.startCommandInterval) {
      clearInterval(this.startCommandInterval);
    }
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    await this.sendCommand('01 05 00 CE FF 00 ED C5');
    this.isWashing = false;
    this.eventEmitter.emit('stopped');
  }

  async reset() {
    await this.sendCommand('01 05 00 CF FF 00 BC 05');
    this.eventEmitter.emit('reset');
  }

  interpretData(data) {
    // TODO: 0101 응답이 여럿 있고, 구분이 불가함. 추후 command queue 로 변경 필요
    // if (data.startsWith('0101') && data.length === 10) {
    //   // M285 읽기 응답
    //   const status = parseInt(data.slice(6, 8), 16);
    //   this.eventEmitter.emit('errorStatusUpdate', status === 1);
    // } else if (data.startsWith('0101')) {
    //   // M136 읽기 응답
    //   const status = parseInt(data.slice(6, 8), 16);
    //   this.eventEmitter.emit('washingComplete', status === 1);

    // 현재는 차량 존재 여부 확인 명령어로만 사용
    if (data.startsWith('0101')) {
      // M46 읽기 응답
      const status = parseInt(data.slice(6, 8), 16);
      this.eventEmitter.emit('carExist', status === 1);
    } else if (data.startsWith('0105')) {
      // M208 또는 M209 쓰기 응답 (세차 시작 명령 성공)
      if (this.startCommandInterval) {
        clearInterval(this.startCommandInterval);
        this.startCommandInterval = null;
      }
      this.isWashing = true;
      this.eventEmitter.emit('startSuccess');  // 'started' 대신 'startSuccess' 이벤트 발생
    } else if (data.startsWith('0103')) {
      // D100 읽기 응답
      const status = parseInt(data.slice(6, 10), 16);
      this.currentStep = this.interpretStep(status);
      this.eventEmitter.emit('statusUpdate', {
        status: status,
        currentStep: this.currentStep
      });
    }
  }

  interpretStep(status) {
    const statusMap = {
      0: '대기 중',
      1: '세차 종료',
      2: '세제 분사 중',
      3: '스노우폼 분사 중',
      4: '왁스 분사 중',
      5: '건조 중',
      6: '고압수 세차 중',
      7: '하부 세차 중',
      8: '세제 분사 완료, 대기 중',
      9: '스노우폼 분사 완료, 고압수 대기 중',
      10: '결제 성공'
    };
    return statusMap[status] || this.currentStep;
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(command.replace(/\s/g, ''), 'hex');
      this.port.write(buffer, (err) => {
        if (err) {
          console.error('명령어 전송 중 오류:', err);
          reject(err);
        } else {
          console.log(`명령어 전송: ${command}`);
          resolve();
        }
      });
    });
  }

  startStatusCheck() {
    this.stopStatusCheck();
    this.sendCommand('01 03 00 64 00 01 C5 D5'); // D100 읽기
    this.statusCheckInterval = setInterval(() => {
      this.sendCommand('01 03 00 64 00 01 C5 D5'); // D100 읽기
    }, this.STATUS_CHECK_INTERVAL);
  }

  // M46 읽기 명령어
  checkExistCar() {
    this.sendCommand('01 01 00 2E 00 01 9D C3'); // M46 읽기
  }

  stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }

  async reconnect() {
    console.log('연결 재시도 중...');
    try {
      if (this.port) {
        await new Promise((resolve) => this.port.close(resolve));
      }
      await this.initialize();
      console.log('재연결 성공');
    } catch (error) {
      console.error('재연결 실패:', error);
      throw error;
    }
  }

  disconnect() {
    this.port.close();
  }
}

module.exports = FL30CarWash;
