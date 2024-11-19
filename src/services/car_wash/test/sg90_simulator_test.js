import ModbusRTU from 'modbus-serial';
import SG90Simulator from '../simulators/sg90_simulator.js';

const simulatorPortName = '/dev/ttys018';
const simulator = new SG90Simulator(simulatorPortName);

const client = new ModbusRTU();

async function runTest() {
  console.log('[test] runTest 시작');
  try {
    await client.connectAsciiSerial('/dev/ttys002', { baudRate: 9600, dataBits: 7, stopBits: 1, parity: 'even' });
    client.setID(1);

    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이터 초기화 대기

    // 세차 시작 테스트 (모드 1)
    await client.writeRegister(0x0905, 0xFF00).then(console.log);
    console.log('[test] 세차 시작 명령 전송');

    // 3초 대기 (세차 진행 중 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 세차기 가동 상태 확인
    let status = await client.readCoils(0x08D6, 1);
    console.log('[test] 세차기 가동 상태:', status.data[0] ? '작동 중' : '대기 중');

    // 총 세차 횟수 확인
    let count = await client.readHoldingRegisters(0x19F6, 1);
    console.log('[test] 총 세차 횟수:', count.data[0]);

    // 2초 더 대기 (세차 완료 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 세차 완료 후 상태 확인
    status = await client.readCoils(0x08D6, 1);
    console.log('[test] 세차 완료 후 상태:', status.data[0] ? '작동 중' : '대기 중');

    console.log('[test] 테스트 완료');
  } catch (error) {
    console.error('[test] 테스트 중 오류 발생:', error);
  } finally {
    client.close();
    simulator.server.close();
  }
}

runTest();
