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
    this.STATUS_CHECK_INTERVAL = 5000; // 5초마다 상태 확인
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
        // check validate
        if (data[0] == 0x3A) {
          data = data.slice(1);
        }
        console.log('data', data.slice(0, -4).toString('ascii'));
        if (data[0] == this.address) {
          const ascii = data.toString('ascii');
          this.interpretData(data.toString('ascii'));
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

  parseModbusASCII(data) {
    console.log("파싱된 요청:", data);
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

  async start(mode) {
    let command;
    switch (mode) {
      case 'MODE1':
        command = '01 05 00 D0 FF 00 8D C3'; // 정밀 세차 모드
        break;
      case 'MODE2':
        command = '01 05 00 D1 FF 00 DC 03'; // 빠른 세차 모드
        break;
      default:
        throw new Error('알 수 없는 세차 모드');
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
    console.log('data', data);
    if (data.startsWith(`:${this.address}`)) {
      data = data.slice(1);
    } else {
      console.log('이 기기로 수신된 메세지가 아닙니다.')
      return;
    }
    console.log('수신된 데이터 (HEX):', data);

    if (data.startsWith('0101') && data.length === 10) {
      // M285 읽기 응답
      const status = parseInt(data.slice(6, 8), 16);
      this.eventEmitter.emit('errorStatusUpdate', status === 1);
    } else if (data.startsWith('0101')) {
      // M136 읽기 응답
      const status = parseInt(data.slice(6, 8), 16);
      this.eventEmitter.emit('washingComplete', status === 1);
    } else if (data.startsWith('0105')) {
      // M208 또는 M209 쓰기 응답 (세차 시작 명령 성공)
      if (this.startCommandInterval) {
        clearInterval(this.startCommandInterval);
        this.startCommandInterval = null;
      }
      this.isWashing = true;
      this.startStatusCheck();
      this.eventEmitter.emit('started');
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
      0: '기계 대기 중',
      1: '세차 종료',
      2: '무브러시 세차 중',
      3: '거품 분사 중',
      4: '왁스 분사 중',
      5: '건조 중',
      6: '고압 물 분사 중',
      7: '하부 분사 중',
      8: '무브러시 세차 완료, 대기 중',
      9: '거품 분사 완료, 브러시 대기 중',
      10: '결제 성공'
    };
    return statusMap[status] || this.currentStep;
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(`3A ${command}`.replace(/\s/g, ''), 'hex');
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
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    this.statusCheckInterval = setInterval(() => {
      if (this.isWashing) {
        this.sendCommand('01 03 00 64 00 01 C5 D5'); // D100 읽기
      } else {
        clearInterval(this.statusCheckInterval);
      }
    }, this.STATUS_CHECK_INTERVAL);
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
}

module.exports = FL30CarWash;
