const { SerialPort } = require('serialport');
const readline = require('readline');

const port = new SerialPort({
  // path: '/dev/tty.usbserial-B003QP3Z', // 실제 포트 이름으로 변경해 주세요
  path: '/dev/tty.usbserial-10', // 실제 포트 이름으로 변경해 주세요
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'even'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 16진수 문자열을 Buffer로 변환하는 함수
function hexToBuffer(hex) {
  return Buffer.from(hex.replace(/\s/g, ''), 'hex');
}

// 명령어 정의
const commands = {
  readM136: '01 01 00 88 00 01 7D E0',
  startPreciseWash: '01 05 00 D0 FF 00 8D C3',
  startQuickWash: '01 05 00 D1 FF 00 DC 03',
  readD100: '01 03 00 64 00 01 C5 D5',
  reset: '01 05 00 CF FF 00 BC 05',
  stop: '01 05 00 CE FF 00 ED C5',
  readM285: '01 01 01 1D 00 01 AC 14' // M285 읽기 명령 추가
};

// 명령어 전송 함수
function sendCommand(commandName) {
  const command = commands[commandName];
  if (command) {
    const buffer = hexToBuffer(command);
    console.log(`전송 데이터 (HEX): ${buffer.toString('hex')}`);
    port.write(buffer, (err) => {
      if (err) {
        console.error('명령어 전송 중 오류:', err);
      } else {
        console.log(`${commandName} 명령어를 전송했습니다.`);
      }
    });
  } else {
    console.error('알 수 없는 명령어:', commandName);
  }
}

// 메뉴 표시 함수
function showMenu() {
  console.log('\n--- 시리얼 통신 테스트 메뉴 ---');
  console.log('1. M136 읽기 (세차 종료 확인)');
  console.log('2. 정밀 세차 시작');
  console.log('3. 빠른 세차 시작');
  console.log('4. D100 읽기 (현재 상태 확인)');
  console.log('5. 연결 상태 확인');
  console.log('6. 리셋');
  console.log('7. 정지');
  console.log('8. M285 읽기 (에러 상태 확인)');
  console.log('9. 종료');
  rl.question('선택하세요: ', handleUserInput);
}

// 사용자 입력 처리 함수
function handleUserInput(choice) {
  switch (choice) {
    case '1':
      sendCommand('readM136');
      break;
    case '2':
      sendCommand('startPreciseWash');
      break;
    case '3':
      sendCommand('startQuickWash');
      break;
    case '4':
      sendCommand('readD100');
      break;
    case '5':
      checkConnection();
      break;
    case '6':
      sendCommand('reset');
      break;
    case '7':
      sendCommand('stop');
      break;
    case '8':
      sendCommand('readM285');
      break;
    case '9':
      console.log('프로그램을 종료합니다.');
      rl.close();
      port.close();
      return;
    default:
      console.log('잘못된 선택입니다.');
  }
  setTimeout(showMenu, 1000); // 1초 후 메뉴 다시 표시
}

// 연결 상태 확인 함수
function checkConnection() {
  if (port.isOpen) {
    console.log('시리얼 포트가 열려 있습니다.');
    // 간단한 테스트 명령 전송
    sendCommand('readD100');
  } else {
    console.log('시리얼 포트가 닫혀 있습니다. 재연결을 시도합니다.');
    port.open((err) => {
      if (err) {
        console.error('포트 열기 실패:', err.message);
      } else {
        console.log('포트가 다시 열렸습니다.');
      }
    });
  }
}

// 시리얼 포트 열기
port.on('open', () => {
  console.log('시리얼 포트가 열렸습니다.');
  showMenu();
});

// 데이터 수신 처리
function interpretData(data) {
  const hex = data.toString('hex');
  // console.log('수신된 데이터 (HEX):', hex);

  if (hex.startsWith('0101') && hex.length === 10) {
    // M285 읽기 응답
    const status = parseInt(hex.slice(6, 8), 16);
    console.log('M285 상태:', status === 1 ? '기계 이상 상태' : '정상 상태');
  } else if (hex.startsWith('0101')) {
    // M136 읽기 응답
    const status = parseInt(hex.slice(6, 8), 16);
    console.log('M136 상태:', status === 1 ? '세차 종료' : '세차 진행 중');
  } else if (hex.startsWith('0105')) {
    // M208 또는 M209 쓰기 응답
    console.log('명령 실행 성공');
  } else if (hex.startsWith('0103')) {
    // D100 읽기 응답
    const status = parseInt(hex.slice(6, 10), 16);
    console.log('D100 상태:', hex.slice(6, 10), status);
    let statusText;
    switch (status) {
      case 0: statusText = '기계 대기 중'; break;
      case 1: statusText = '세차 종료'; break;
      case 2: statusText = '무브러시 세차 중'; break;
      case 3: statusText = '거품 분사 중'; break;
      case 4: statusText = '왁스 분사 중'; break;
      case 5: statusText = '건조 중'; break;
      case 6: statusText = '고압 물 분사 중'; break;
      case 7: statusText = '하부 분사 중'; break;
      case 8: statusText = '무브러시 세차 완료, 대기 중'; break;
      case 9: statusText = '거품 분사 완료, 브러시 대기 중'; break;
      case 10: statusText = '결제 성공'; break;
      default: statusText = '알 수 없는 상태'; break;
    }
    console.log('D100 상태:', statusText);
  } else {
    // console.log('알 수 없는 응답 형식');
  }
}

port.on('data', (data) => {
  // console.log('data:', data);
  interpretData(data);
});

// 오류 처리
port.on('error', (err) => {
  console.error('시리얼 포트 오류:', err);
});

// 프로그램 종료 시 정리
rl.on('close', () => {
  port.close(() => {
    console.log('시리얼 포트가 닫혔습니다.');
    process.exit(0);
  });
});

// 초기 연결 상태 확인
checkConnection();
