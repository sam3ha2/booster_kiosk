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

  getAmountText(amount, { isCancel = false, unit = '' }) {
    return `${isCancel ? '-' : ''}${amount.toLocaleString()}${unit}`;
  }

  getCardNumber(cardNo) {
    const paddedNumber = cardNo + '*'.repeat(16 - cardNo.length);
    return paddedNumber.replace(/(.{4})/g, '$1-').slice(0, -1);
  }

  async printReceipt({ shop, info, headquarters, isCancel = false }) {
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
            .text(`${isCancel ? '[취소]' : ''}${shop.shop_name}`, 'EUC-KR')
            .size(0.5, 0.5)
            .text(`${this.alignLeftRight('사업자번호', shop.registration_number)}`, 'EUC-KR')
            .text(`${this.alignLeftRight(`대표자: ${shop.representative_name}`, `Tel: ${shop.shop_tel}`)}`, 'EUC-KR')
            .text(`주  소: ${shop.shop_address}`, 'EUC-KR')
            .text('-'.repeat(48), 'EUC-KR')
            .text(`상  품: ${info.product_name}`, 'EUC-KR')
            .align('RT')
            .text(`${this.alignLeftRight('금  액: ', `${this.getAmountText(info.tran_amt - info.vat_amt, { isCancel })}`, 20)}`, 'EUC-KR')
            .text(`${this.alignLeftRight('부가세: ', `${this.getAmountText(info.vat_amt, { isCancel })}`, 20)}`, 'EUC-KR')
            .text(`${this.alignLeftRight('합  계: ', `${this.getAmountText(info.tran_amt, { isCancel })}`, 20)}`, 'EUC-KR')
            .text('-'.repeat(48), 'EUC-KR')
            .align('LT')
            .text('카드정보', 'EUC-KR')
            .text(`카드번호: ${this.getCardNumber(info.card_no)}`, 'EUC-KR')
            .text(`승인금액: ${this.getAmountText(info.tran_amt, { isCancel, unit: '원' })}`, 'EUC-KR')
            .text(`승인번호: ${info.auth_no}`, 'EUC-KR')
            .text(`매 입 사: ${info.accepter_name || ''}`, 'EUC-KR')
            .text(`가맹번호: ${info.merchant_no || ''}`, 'EUC-KR')
            .text(`거래번호: ${info.transaction_id || ''}`, 'EUC-KR')
            .text('-'.repeat(48), 'EUC-KR')
            .text(`${this.alignLeftRight('본사', headquarters.company)}`, 'EUC-KR')
            .text(`${this.alignLeftRight('사업자번호', headquarters.registration_number)}`, 'EUC-KR')
            .text(`${this.alignLeftRight(`대표자: ${headquarters.representative}`, `Tel: ${headquarters.tel}`)}`, 'EUC-KR')
            .text(`주  소: ${headquarters.address}`, 'EUC-KR');                 

          printer
            .cut()
            .close();
        } catch (err) {
          console.error('프린터 출력 오류:', err);
          throw err;
        }
      })
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