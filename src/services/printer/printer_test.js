const PrinterUtil = require('./printer_manager');

async function testPrinter() {
  try {
    // 연결 가능한 프린터 목록 출력
    console.log('연결 가능한 프린터 목록:', PrinterUtil.getPrinterList());

    const printerUtil = new PrinterUtil();
    
    await printerUtil.print({
      text: [
        { content: '=================\n', encoding: 'EUC-KR' },
        { content: '프린터 테스트\n', encoding: 'EUC-KR' },
        { content: '=================\n', encoding: 'EUC-KR' },
        { content: '한글 테스트 1\n', encoding: 'EUC-KR' },
        { content: '한글 테스트 2\n', encoding: 'EUC-KR' },
        { content: '=================\n', encoding: 'EUC-KR' },
      ]
    });
    
    console.log('프린트 완료');
  } catch (error) {
    console.error('프린터 테스트 실패:', error);
  }
}

testPrinter();