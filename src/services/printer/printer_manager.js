const escpos = require('escpos');
escpos.USB = require('escpos-usb');

class PrinterManager {
  constructor() {
    this.device = null;
  }

  initialize({ encoding = 'EUC-KR' } = {}) {
    this.options = { encoding };
    const devices = escpos.USB.findPrinter();
    if (devices.length === 0) {
      console.error('프린터를 찾을 수 없습니다.');
      throw new Error('프린터를 찾을 수 없습니다.');
    }
    this.device = new escpos.USB(devices[0].deviceDescriptor.idVendor, devices[0].deviceDescriptor.idProduct);
  }

  disconnect() {
    this.device.close();
    this.device = null;
  }

  getDeviceStatus() {
    return {
      connected: this.device !== null
    };
  }

  async printReceipt({ shop, product, payment }) {
    try {
      this.device.open((error) => {
        if (error) {
          console.error('프린터 연결 오류:', error);
          throw error;
        }

        try {
          const printer = new escpos.Printer(this.device, this.options);

          printer
            .font('A')
            .style('NORMAL')
            .align('LT')
            .size(1, 1)
            .text(`${shop.shop_name}`, 'EUC-KR')
            .size(0.5, 0.5)
            .text(`사업자번호:${shop.registration_number}`, 'EUC-KR')
            .text(`${this.alignLeftRight(`대표자:${shop.representative_name}`, `Tel:${shop.shop_tel}`)}`, 'EUC-KR')
            .text(`주  소:${shop.shop_address}`, 'EUC-KR')
            .drawLine()
            .text(`상  품:${product.name}`, 'EUC-KR')
            .align('RT')
            .text(`${this.alignLeftRight('금  액:', `${product.price.toLocaleString()}원`, 20)}`, 'EUC-KR')
            .text(`${this.alignLeftRight('부가세:', `${Math.floor(product.price / 11).toLocaleString()}원`, 20)}`, 'EUC-KR')
            .text(`${this.alignLeftRight('합  계:', `${product.price.toLocaleString()}원`, 20)}`, 'EUC-KR');

          printer
            .cut()
            .close();
        } catch (err) {
          console.error('프린터 출력 오류:', err);
          throw err;
        }
      })
      // return await this.print({
      //   text: [
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '예약 상품\n', encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `${product.name}\n\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '가맹점명      씻자 익스프레스 서울 강서직영점\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '사업자번호                    ###-##-#####\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '대표자명 : 윤영현         Tel : 1899-6090\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '주소 : 서울시 강서구 공항대로 432, 1층\n\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '상품 금액 정보\n\n', encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `상품 : ${product.name}\n\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `금액 : ${product.price.toLocaleString()}원\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `부가세 : ${Math.floor(product.price / 11).toLocaleString()}원\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `합계 : ${product.price.toLocaleString()}원\n\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '카드 정보\n\n', encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `카드번호: ${payment.card_number}\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `승인 금액: ${product.price.toLocaleString()}원\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `승인번호: ${payment.approval_number}\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `매입사: ${payment.card_company || ''}\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `가맹번호: ${payment.merchant_number || ''}\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: `거래번호: ${payment.transaction_id || ''}\n\n`, encoding: 'EUC-KR', align: 'CT', size: [1, 2] },
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '      영수증 리뷰 또는 리뷰 이벤트 참여로\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: ' 영수증을 찍어서 올리실 분들은 하단 내용을\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '       빼고 찍거나 접어서 촬영해 주세요.\n\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '            네이버 리뷰 바로가기 QR\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '                      QR 이미지\n\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '-----------------------------------\n', encoding: 'EUC-KR', align: 'CT' },
      //     { content: '본사                      페르소네 주식회사\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '사업자번호                    631-88-02907\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '대표자명 : 윤영현         문의 : 1899-6090\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '주소 : 서울시 강남구 영동대로 602, 6층\n', encoding: 'EUC-KR', align: 'LT' },
      //     { content: '\n\n\n', encoding: 'EUC-KR', align: 'LT' }
      //   ]
      // });
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
              .style('normal')

            text.forEach(({ content, encoding, align = 'LT', size = [0.5, 0.5] }) => {
              printer
                .align(align)
                .size(size[0], size[1])
                .text(content, encoding);
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

  alignLeftRight(left, right, lineWidth = 48) {
    const availableSpace = lineWidth - this.getTextLength(left) - this.getTextLength(right);
    const spaces = ' '.repeat(Math.max(0, availableSpace));
    return `${left}${spaces}${right}`;
  }

  getTextLength(text) {
    return text.split('').reduce((len, char) => {
        // 한글은 2바이트, 나머지는 1바이트로 계산
        return len + (char.match(/[가-힣]/) ? 2 : 1);
    }, 0);
  }
}

module.exports = PrinterManager;