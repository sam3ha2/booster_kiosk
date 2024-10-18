const readline = require('readline');
const FL30CarWash = require('../machine_types/fl30_car_wash');

// const clientPortName = '/dev/tty.usbserial-B003QP3Z';
// const clientPortName = '/dev/tty.usbserial-10';
const clientPortName = '/dev/ttys017';
const carWash = new FL30CarWash({ portName: clientPortName });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function initializeTest() {
  console.log('FL30 세차기 초기화 중...');
  try {
    await carWash.initialize();
    console.log('FL30 세차기 초기화 완료');

    // 이벤트 리스너 설정
    carWash.on('statusUpdate', (status) => {
      console.log('상태 업데이트 수신:', status);
    });
    carWash.on('errorStatusUpdate', (isError) => {
      console.log('오류 상태 업데이트 수신:', isError);
    });
    carWash.on('washingComplete', (isComplete) => {
      console.log('세차 완료 상태 수신:', isComplete);
    });
    carWash.on('started', () => {
      console.log('세차 시작 신호 수신');
    });
    carWash.on('stopped', () => {
      console.log('세차 정지 신호 수신');
    });
  } catch (error) {
    console.error('FL30 세차기 초기화 실패:', error);
    process.exit(1);
  }
}

function showMenu() {
  console.log('\n--- FL30 시뮬레이터 테스트 메뉴 ---');
  console.log('1. 세차 시작 (정밀 세차)');
  console.log('2. 세차 시작 (빠른 세차)');
  console.log('3. 세차 정지');
  console.log('4. 상태 확인 (D100 읽기)');
  console.log('5. 세차 완료 확인 (M136 읽기)');
  console.log('6. 기계 작동 상태 확인 (M37 읽기)');
  console.log('7. 오류 상태 확인 (M285 읽기)');
  console.log('8. 리셋');
  console.log('9. 종료');
  rl.question('선택하세요: ', handleUserInput);
}

async function handleUserInput(choice) {
  try {
    switch (choice) {
      case '1':
        console.log('정밀 세차 시작 명령 전송 중...');
        await carWash.start('MODE1');
        break;
      case '2':
        console.log('빠른 세차 시작 명령 전송 중...');
        await carWash.start('MODE2');
        break;
      case '3':
        console.log('세차 정지 명령 전송 중...');
        await carWash.stop();
        break;
      case '4':
        console.log('D100 읽기 명령 전송 중...');
        await carWash.sendCommand('01 03 00 64 00 01 C5 D5');
        break;
      case '5':
        console.log('M136 읽기 명령 전송 중...');
        await carWash.sendCommand('01 01 00 88 00 01 7D E0');
        break;
      case '6':
        console.log('M37 읽기 명령 전송 중...');
        await carWash.sendCommand('01 01 00 25 00 01 3D E1');
        break;
      case '7':
        console.log('M285 읽기 명령 전송 중...');
        await carWash.sendCommand('01 01 01 1D 00 01 AC 14');
        break;
      case '8':
        console.log('리셋 명령 전송 중...');
        await carWash.reset();
        break;
      case '9':
        console.log('테스트를 종료합니다.');
        await carWash.stop();
        rl.close();
        process.exit(0);
      default:
        console.log('잘못된 선택입니다.');
    }
  } catch (error) {
    console.error('오류 발생:', error);
  }
  showMenu();
}

console.log('FL30 시뮬레이터 테스트를 시작합니다...');
initializeTest().then(showMenu).catch(error => {
  console.error('초기화 중 오류 발생:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  carWash.stop().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 거부:', reason);
  carWash.stop().then(() => process.exit(1));
});
