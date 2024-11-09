const readline = require('readline');
const FL30CarWash = require('../machine_types/fl30_car_wash');

class FL30Test {
  constructor(config) {
    this.carWash = new FL30CarWash(config);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    try {
      console.log('FL30 세차기 초기화 중...');
      await this.carWash.initialize();
      console.log('FL30 세차기 초기화 완료');

      // 이벤트 리스너 설정
      this.carWash.on('statusUpdate', (status) => {
        console.log('\n상태 업데이트:', status);
      });

      this.carWash.on('errorStatusUpdate', (isError) => {
        console.log('\n오류 상태 업데이트:', isError ? '🔴 오류 발생' : '🟢 정상');
      });

      this.carWash.on('carExist', (isExist) => {
        console.log('\n차량 존재 여부:', isExist ? '🚗 있음' : '❌ 없음');
      });

      this.carWash.on('washingComplete', (isComplete) => {
        console.log('\n세차 완료 상태:', isComplete ? '✅ 완료' : '🔄 진행중');
      });

      this.carWash.on('started', () => {
        console.log('\n🚿 세차 시작됨');
      });

      this.carWash.on('stopped', () => {
        console.log('\n⏹ 세차 정지됨');
      });

    } catch (error) {
      console.error('FL30 세차기 초기화 실패:', error);
      throw error;
    }
  }

  showMenu() {
    console.log('\n=== FL30 세차기 테스트 메뉴 ===');
    console.log('1. 세차 시작 (MODE1 - 빠른 세차)');
    console.log('2. 세차 시작 (MODE2 - 일반 세차)');
    console.log('3. 세차 시작 (MODE3 - 정밀 세차)');
    console.log('4. 상태 확인 (D100)');
    console.log('5. 차량 존재 여부 확인 (M46)');
    console.log('6. 오류 상태 확인 (M285)');
    console.log('7. 세차 완료 상태 확인 (M136)');
    console.log('88. 세차 정지');
    console.log('99. 리셋');
    console.log('100. 종료');
    
    this.rl.question('\n선택하세요: ', async (choice) => {
      await this.handleChoice(choice);
    });
  }

  async handleChoice(choice) {
    try {
      switch(choice) {
        case '1':
          console.log('\nMODE1 세차 시작...');
          this.carWash.start('MODE1')
            .then((response) => console.log('MODE1', response))
            .catch((error) => console.error('error', error));
          break;

        case '2':
          console.log('\nMODE2 세차 시작...');
          this.carWash.start('MODE2')
            .then((response) => console.log('MODE2', response))
            .catch((error) => console.error('error', error));
          break;

        case '3':
          console.log('\nMODE3 세차 시작...');
          this.carWash.start('MODE3')
            .then((response) => console.log('MODE3', response))
            .catch((error) => console.error('error', error));
          break;

        case '4':
          console.log('\n상태 확인...');
          await this.carWash.checkStatus();
          break;

        case '5':
          console.log('\n차량 존재 여부 확인...');
          await this.carWash.checkExistCar();
          break;

        case '6':
          console.log('\n오류 상태 확인...');
          await this.carWash.checkErrorStatus();
          break;

        case '7':
          console.log('\n세차 완료 상태 확인...');
          await this.carWash.checkWashingComplete();
          break;

        case '88':
          console.log('\n세차 정지...');
          await this.carWash.stop();
          break;

        case '99':
          console.log('\n리셋...');
          await this.carWash.reset();
          break;

        case '100':
          console.log('프로그램을 종료합니다.');
          await this.disconnect();
          process.exit(0);
          break;

        default:
          console.log('잘못된 선택입니다.');
      }
    } catch (error) {
      console.error('명령 실행 중 오류 발생:', error);
    }

    this.showMenu();
  }

  async disconnect() {
    try {
      await this.carWash.stop();
      this.carWash.disconnect();
      this.rl.close();
      console.log('연결 종료됨');
    } catch (error) {
      console.error('연결 종료 중 오류:', error);
    }
  }
}

// 테스트 실행
async function runTest() {
  const tester = new FL30Test({
    portName: process.argv[2] || '/dev/ttys017'
  });

  try {
    await tester.initialize();
    tester.showMenu();
  } catch (error) {
    console.error('테스트 초기화 실패:', error);
    process.exit(1);
  }
}

// 프로그램 시작
if (require.main === module) {
  runTest().catch(console.error);
}

// 프로세스 종료 처리
process.on('SIGINT', async () => {
  console.log('\n프로그램을 종료합니다.');
  if (global.tester) {
    await global.tester.disconnect();
  }
  process.exit(0);
});

module.exports = FL30Test; 