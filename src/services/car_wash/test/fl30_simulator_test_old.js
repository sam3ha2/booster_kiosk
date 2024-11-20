import readline from 'readline';
import FL30CarWash from '../machine_types/fl30_car_wash.js';

const clientPortName = '/dev/tty.usbserial-B003QP3Z';
const carWash = new FL30CarWash({ portName: clientPortName });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function initializeTest() {
  await carWash.initialize();
  console.log('테스트 환경이 초기화되었습니다.');
}

function showMenu() {
  console.log('\n--- FL30 시뮬레이터 테스트 메뉴 ---');
  console.log('1. 세차 시작 (정밀 세차)');
  console.log('2. 세차 시작 (간단 세차)');
  console.log('3. 세차 정지');
  console.log('4. 상태 확인');
  console.log('5. 원점 상태 확인');
  console.log('6. 초기 상태 확인');
  console.log('7. 차량 존재 확인');
  console.log('8. 오류 상태 확인');
  console.log('9. 현재 프로세스 확인');
  console.log('10. 종료');
  rl.question('선택하세요: ', handleUserInput);
}

async function handleUserInput(choice) {
  try {
    switch (choice) {
      case '1':
        await carWash.start('MODE2');
        console.log('정밀 세차 시작 명령을 보냈습니다.');
        break;
      case '2':
        await carWash.start('MODE1');
        console.log('간단 세차 시작 명령을 보냈습니다.');
        break;
      case '3':
        await carWash.stop();
        console.log('세차 정지 명령을 보냈습니다.');
        break;
      case '4':
        await checkStatus();
        break;
      case '5':
        const originStatus = await carWash.checkOriginStatus();
        console.log('원점 상태:', originStatus);
        break;
      case '6':
        const initialStatus = await carWash.checkInitialStatus();
        console.log('초기 상태:', initialStatus);
        break;
      case '7':
        const carPresent = await carWash.checkCarStoppedStatus();
        console.log('차량 존재:', carPresent);
        break;
      case '8':
        const errorStatus = await carWash.checkErrorStatus();
        console.log('오류 상태:', errorStatus);
        break;
      case '9':
        const currentProcess = await carWash.getCurrentProcess();
        console.log('현재 프로세스:', currentProcess);
        break;
      case '10':
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
  const status = await carWash.status();
  console.log('\n--- 현재 상태 ---');
  console.log('세차기 상태:', status.running ? '작동 중' : '대기 중');
  console.log('원점 상태:', status.origin);
  console.log('초기 상태:', status.initial);
  console.log('차량 존재:', status.carStopped ? '있음' : '없음');
  console.log('오류 상태:', status.error ? '오류' : '정상');
  console.log('현재 프로세스:', status.currentProcess);
}

initializeTest().then(showMenu).catch(console.error);
