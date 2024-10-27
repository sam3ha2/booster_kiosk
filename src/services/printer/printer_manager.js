const escpos = require('escpos');
escpos.USB = require('escpos-usb');

class PrinterManager {
  constructor({ encoding = 'EUC-KR' } = {}) {
    this.options = { encoding };
    // USB 장치 목록 확인 및 초기화
    const devices = escpos.USB.findPrinter();
    if (devices.length === 0) {
      return;
      // throw new Error('연결된 프린터를 찾을 수 없습니다.');
    }
    
    // 첫 번째 발견된 프린터 사용
    this.device = new escpos.USB(devices[0].deviceDescriptor.idVendor, devices[0].deviceDescriptor.idProduct);
  }

  async printReceipt({ product, payment }) {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR');
      const timeStr = now.toLocaleTimeString('ko-KR');

      return await this.print({
        text: [
          { content: '==================\n', encoding: 'EUC-KR' },
          { content: '   부스터 세차장   \n', encoding: 'EUC-KR' },
          { content: '==================\n', encoding: 'EUC-KR' },
          { content: `일시: ${dateStr} ${timeStr}\n`, encoding: 'EUC-KR' },
          { content: `상품: ${product.name}\n`, encoding: 'EUC-KR' },
          { content: `금액: ${product.price.toLocaleString()}원\n`, encoding: 'EUC-KR' },
          { content: '------------------\n', encoding: 'EUC-KR' },
          { content: '결제 정보\n', encoding: 'EUC-KR' },
          { content: `카드번호: ${payment.card_number}\n`, encoding: 'EUC-KR' },
          { content: `승인번호: ${payment.approval_number}\n`, encoding: 'EUC-KR' },
          { content: `승인일시: ${payment.auth_datetime}\n`, encoding: 'EUC-KR' },
          { content: '==================\n', encoding: 'EUC-KR' },
          { content: '이용해 주셔서 감사합니다\n', encoding: 'EUC-KR' },
          { content: '\n\n\n', encoding: 'EUC-KR' }
        ]
      });
    } catch (error) {
      console.error('영수증 출력 오류:', error);
      throw error;
    }
  }

  async print({ text = [] } = {}) {
    try {
      return new Promise((resolve, reject) => {
        this.device.open((error) => {
          if (error) {
            console.error('프린터 연결 오류:', error);
            reject(error);
            return;
          }

          try {
            const printer = new escpos.Printer(this.device, this.options);

            printer
              .font('a')
              .align('ct')
              .style('normal')
              .size(1, 1);

            text.forEach(({ content, encoding }) => {
              printer.text(content, encoding);
            });

            printer
              .cut()
              .close();

            resolve({ success: true });
          } catch (err) {
            console.error('프린터 출력 오류:', err);
            reject(err);
          }
        });
      });
    } catch (error) {
      console.error('프린터 초기화 오류:', error);
      throw error;
    }
  }

  // 프린터 정보 확인용 메서드
  static getPrinterList() {
    try {
      const devices = escpos.USB.findPrinter();
      return devices.map(device => ({
        vendorId: device.deviceDescriptor.idVendor,
        productId: device.deviceDescriptor.idProduct,
        manufacturer: device.manufacturer,
        product: device.product
      }));
    } catch (error) {
      console.error('프린터 목록 조회 오류:', error);
      return [];
    }
  }
}

module.exports = PrinterManager;