const AbstractCarWashMachine = require('../abstract_car_wash_machine');

class SG90CarWash extends AbstractCarWashMachine {
  constructor(config) {
    super(config);
    this.address = '01'; // SG90의 주소
  }

  getSerialConfig() {
    return {
      path: this.config.portName,
      baudRate: 9600,
      dataBits: 7,
      stopBits: 1,
      parity: 'even'
    };
  }

  async initialize() {
    await super.initialize();
    console.log('SG90 세차기 초기화 완료');
  }

  async start(mode) {
    const commands = {
      1: '3A 30 31 30 35 30 39 30 35 46 46 30 30 45 44 0D 0A',
      2: '3A 30 31 30 35 30 39 30 36 46 46 30 30 45 43 0D 0A',
      3: '3A 30 31 30 35 30 39 30 34 46 46 30 30 45 45 0D 0A',
      4: '3A 30 31 30 35 30 39 30 38 46 46 30 30 45 41 0D 0A'
    };
    await this.sendCommand(commands[mode]);
    console.log(`SG90 세차기 모드 ${mode} 시작`);
  }

  async stop() {
    await this.sendCommand('3A 30 31 30 35 30 38 33 43 46 46 30 30 42 37 0D 0A');
    console.log('SG90 세차기 정지');
  }

  async status() {
    return await this.checkOperationStatus();
  }

  async pause() {
    await this.sendCommand('3A 30 31 30 35 30 38 34 37 46 46 30 30 41 43 0D 0A');
    console.log('SG90 세차기 일시 정지');
  }

  async resume() {
    await this.sendCommand('3A 30 31 30 35 30 38 34 37 30 30 30 30 41 42 0D 0A');
    console.log('SG90 세차기 재개');
  }

  async reset() {
    await this.sendCommand('3A 30 31 30 35 30 38 32 30 46 46 30 30 44 33 0D 0A');
    console.log('SG90 세차기 리셋');
  }

  async checkCarPresence() {
    await this.sendCommand('3A 30 31 30 31 30 41 46 30 30 30 30 31 30 33 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkReadyForNextWash() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkCarEntryStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 36 36 30 30 30 31 38 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkOperationStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    // 응답 처리 로직 필요
  }

  async checkErrorStatus() {
    await this.sendCommand('3A 30 31 30 31 30 38 44 39 30 30 30 31 31 43 0D 0A');
    // 응답 처리 로직 필요
  }

  async getTotalWashCount() {
    await this.sendCommand('3A 30 31 30 33 31 39 46 36 30 30 30 31 45 43 0D 0A');
    // 응답 처리 로직 필요
  }

  async getDailyWashCount() {
    await this.sendCommand('3A 30 31 30 33 31 39 46 38 30 30 30 31 45');
    // 응답 처리 로직 필요
  }

  onDataReceived(data) {
    console.log('SG90 세차기로부터 데이터 수신:', data);
    
    // 16진수 문자열을 바이트 배열로 변환
    const bytes = data.split(' ').map(hex => parseInt(hex, 16));
    
    // 응답 형식 확인
    if (bytes.length < 7 || bytes[0] !== 0x3A || bytes[bytes.length - 2] !== 0x0D || bytes[bytes.length - 1] !== 0x0A) {
      console.error('잘못된 응답 형식:', data);
      return;
    }
    
    const address = bytes[1].toString(16).padStart(2, '0');
    const functionCode = bytes[2];
    const dataLength = bytes[3];
    const responseData = bytes.slice(4, -4);
    
    switch (functionCode) {
      case 0x01: // 상태 확인 응답
        this.handleStatusResponse(responseData);
        break;
      case 0x03: // 데이터 읽기 응답
        this.handleDataReadResponse(responseData);
        break;
      case 0x05: // 명령 실행 응답
        this.handleCommandResponse(responseData);
        break;
      default:
        console.warn('알 수 없는 기능 코드:', functionCode);
    }
  }
  
  handleStatusResponse(data) {
    const status = data[0];
    const statusMap = {
      0x00: '대기 중',
      0x01: '작동 중',
      0x02: '일시 정지',
      0x03: '에러 발생'
    };
    console.log('세차기 상태:', statusMap[status] || '알 수 없는 상태');
    // 여기에 상태에 따른 추가 로직을 구현할 수 있습니다.
  }
  
  handleDataReadResponse(data) {
    // 데이터 읽기 응답 처리 (예: 세차 횟수)
    const value = data.reduce((acc, byte) => (acc << 8) | byte, 0);
    console.log('읽은 데이터 값:', value);
    // 여기에 읽은 데이터에 대한 추가 처리 로직을 구현할 수 있습니다.
  }
  
  handleCommandResponse(data) {
    const result = data[0];
    if (result === 0x00) {
      console.log('명령 실행 성공');
    } else {
      console.error('명령 실행 실패, 에러 코드:', result);
    }
    // 여기에 명령 실행 결과에 따른 추가 로직을 구현할 수 있습니다.
  }
}
module.exports = SG90CarWash;