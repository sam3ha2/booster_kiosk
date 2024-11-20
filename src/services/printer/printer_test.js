import PrinterManager from './printer_manager.js';

async function testPrinter() {
  try {
    // 연결 가능한 프린터 목록 출력
    console.log('연결 가능한 프린터 목록:', PrinterManager.getPrinterList());

    const printerManager = new PrinterManager();
    printerManager.initialize();

    // await printerManager.print({
    //   text: [
    //     { content: '123456789012345678901234567890123456789012345678901234567890', encoding: 'EUC-KR' },
    //     { content: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz', encoding: 'EUC-KR' },
    //     { content: '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하', encoding: 'EUC-KR' },
    //   ]
    // });

    await printerManager.printReceipt({
      shop: {
        shop_name: '테스트 상점',
        registration_number: '1234567890',
        representative_name: '홍길동',
        shop_tel: '010-1234-5678',
        shop_address: '서울특별시 강남구 테스트동 123-45',
      },
      product: {
        name: '테스트 상품',
        price: 10000,
      },
      payment: {
        amount: 10000,
        payment_method: '카드',
      },
    });
    console.log('프린트 완료');
  } catch (error) {
    console.error('프린터 테스트 실패:', error);
  }
}

testPrinter();
