const { SerialPort } = require('serialport');
const SG90Simulator = require('./sg90_simulator');
const { ReadlineParser } = require('@serialport/parser-readline');

const testPort = new SerialPort({
  path: '/dev/ttys002',
  baudRate: 9600,
  dataBits: 7,
  stopBits: 1,
  parity: 'even'
});

const parser = testPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

const simulator = new SG90Simulator('/dev/ttys018');

function sendCommand(command) {
  return new Promise((resolve, reject) => {
    testPort.write(`${command}\r\n`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function readResponse() {
  return new Promise((resolve) => {
    parser.once('data', (data) => {
      resolve(data);
    });
  });
}

function parseResponse(response) {
  const bytes = response.split(' ').map(hex => parseInt(hex, 16));
  return {
    address: bytes[1].toString(16).padStart(2, '0'),
    functionCode: bytes[2],
    data: bytes.slice(4, -4)
  };
}

async function runTest() {
  console.log('[test] runTest 시작');
  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이터 초기화 대기

    // 세차 시작 테스트 (모드 1)
    await sendCommand('3A 30 31 30 35 30 39 30 35 46 46 30 30 45 44 0D 0A');
    let response = await readResponse();
    console.log('[test] 세차 시작 응답:', response);
    let parsed = parseResponse(response);
    console.log('[test] 파싱된 응답:', parsed);

    // 3초 대기 (세차 진행 중 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 세차기 가동 상태 확인
    await sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    response = await readResponse();
    console.log('[test] 세차기 가동 상태 응답:', response);
    parsed = parseResponse(response);
    console.log('[test] 파싱된 응답:', parsed);

    // 총 세차 횟수 확인
    await sendCommand('3A 30 31 30 33 31 39 46 36 30 30 30 31 45 43 0D 0A');
    response = await readResponse();
    console.log('[test] 총 세차 횟수 응답:', response);
    parsed = parseResponse(response);
    console.log('[test] 파싱된 응답:', parsed);
    if (parsed && parsed.functionCode === 0x03 && parsed.data.length === 2) {
      const count = (parsed.data[0] << 8) | parsed.data[1];
      console.log('[test] 총 세차 횟수:', count);
    }

    // 2초 더 대기 (세차 완료 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 세차 완료 후 상태 확인
    await sendCommand('3A 30 31 30 31 30 38 44 36 30 30 30 31 31 46 0D 0A');
    response = await readResponse();
    console.log('[test] 세차 완료 후 상태 응답:', response);
    parsed = parseResponse(response);
    console.log('[test] 파싱된 응답:', parsed);

    console.log('[test] 테스트 완료');
  } catch (error) {
    console.error('[test] 테스트 중 오류 발생:', error);
  } finally {
    testPort.close();
    simulator.serialPort.close();
  }
}

runTest();