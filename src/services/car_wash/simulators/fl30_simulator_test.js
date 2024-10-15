const readline = require('readline');
const FL30CarWash = require('../machine_types/fl30_car_wash');

// const clientPortName = '/dev/tty.usbserial-B003QP3Z';
const clientPortName = '/dev/tty.usbserial-10';
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
  console.log('4. 상태 확인');
  console.log('5. 세차 완료 확인');
  console.log('6. 기계 작동 상태 확인');
  console.log('7. 오류 상태 확인');
  console.log('8. 현재 프로세스 확인');
  console.log('9. 종료');
  rl.question('선택하세요: ', handleUserInput);
}

async function handleUserInput(choice) {
  try {
    switch (choice) {
      case '1':
        console.log('정밀 세차 시작 명령 전송 중...');
        await carWash.start('MODE1');
        console.log('정밀 세차 시작 명령을 보냈습니다.');
        break;
      case '2':
        console.log('빠른 세차 시작 명령 전송 중...');
        await carWash.start('MODE2');
        console.log('빠른 세차 시작 명령을 보냈습니다.');
        break;
      case '3':
        console.log('세차 정지 명령 전송 중...');
        await carWash.stop();
        console.log('세차 정지 명령을 보냈습니다.');
        break;
      case '4':
        await checkStatus();
        break;
      case '5':
        console.log('세차 완료 상태 확인 중...');
        const isComplete = await carWash.isWashingComplete();
        console.log('세차 완료 상태:', isComplete ? '완료' : '진행 중');
        break;
      case '6':
        console.log('기계 작동 상태 확인 중...');
        const isRunning = await carWash.isRunning();
        console.log('기계 작동 상태:', isRunning ? '작동 중' : '대기 중');
        break;
      case '7':
        console.log('오류 상태 확인 중...');
        const errorStatus = await carWash.checkErrorStatus();
        console.log('오류 상태:', errorStatus ? '오류 발생' : '정상');
        break;
      case '8':
        console.log('현재 프로세스 확인 중...');
        const currentProcess = await carWash.getCurrentProcess();
        console.log('현재 프로세스:', currentProcess);
        break;
      case '9':
        console.log('테스트를 종료합니다.');
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

async function checkStatus() {
  console.log('\n세차기 상태 확인 중...');
  const status = await carWash.status();
  const state = await carWash.getState();
  console.log('\n--- 현재 상태 ---');
  console.log('세차기 상태:', status.running ? '작동 중' : '대기 중');
  console.log('오류 상태:', status.error ? '오류' : '정상');
  console.log('프로세스 상태:', carWash.interpretProcessStatus(status.processStatus));
  console.log('사용 가능 여부:', state.isAvailable ? '사용 가능' : '사용 중');
  console.log('세차 진행 중:', state.isWashing ? '예' : '아니오');
  console.log('남은 시간:', state.remainingTime, '초');
  console.log('진행률:', state.progress, '%');
  console.log('현재 단계:', state.currentStep);
  console.log('현재 모드:', state.currentMode || '없음');
}

console.log('FL30 시뮬레이터 테스트를 시작합니다...');
initializeTest().then(showMenu).catch(error => {
  console.error('초기화 중 오류 발생:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  carWash.stopStateUpdates();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 거부:', reason);
  carWash.stopStateUpdates();
  process.exit(1);
});
