import displayControl from 'display-control';

console.log('모니터 상태 테스트를 시작합니다...');
console.log('Supported: ' + displayControl.supported());

console.log('모니터를 끕니다...');
displayControl.sleep();

setTimeout(() => {
  console.log('모니터를 켭니다...');
  displayControl.wake();

  console.log('테스트가 완료되었습니다.');
}, 5000);
