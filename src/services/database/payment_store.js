const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

class PaymentStore {
  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'data', 'payments');
    this.ensureDatabase();
  }

  ensureDatabase() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getFilePath(date) {
    const fileName = `${date}.json`;
    return path.join(this.baseDir, fileName);
  }

  // 한국 시간 기준으로 오늘 날짜 가져오기
  getKoreanToday() {
    const date = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return date.split('.').slice(0, 3).map(part => part.trim()).join('-');
  }

  // 결제 요청 등록
  async registerPayment(paymentData) {
    const today = this.getKoreanToday();
    const filePath = this.getFilePath(today);
    
    let data = await this.getPaymentsByDate(today);
    const newPayment = {
      id: crypto.randomUUID(),
      tran_amt: paymentData.tranAmt,
      vat_amt: paymentData.vatAmt,
      svc_amt: paymentData.svcAmt,
      installment: paymentData.installment,
      card_no: '',
      auth_no: '',
      auth_date: '',
      status: 'PENDING',
      reply_msg: '',
      trade_req_time: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.orders.push(newPayment);
    await this.saveToFile(filePath, data);
    return newPayment;
  }

  async updatePayment(id, date, status, updateData) {
    const filePath = this.getFilePath(date);
    let dbData = await this.getPaymentsByDate(date);
    
    const paymentIndex = dbData.orders.findIndex(p => p.id === id);
    if (paymentIndex === -1) return null;

    const orgData = dbData.orders[paymentIndex];
    let result = null;

    switch (status) {
      case 'APPROVED':
        result = await this.updatePaymentSuccess(orgData, updateData);
        break;
      case 'FAILED':
        result = await this.updatePaymentFailure(orgData, updateData);
        break;
      case 'CANCELED':
        result = await this.updatePaymentCancel(orgData, updateData);
        break;
      default:
        throw new Error('Invalid payment status');
    }

    dbData.orders[paymentIndex] = result;
    await this.saveToFile(filePath, dbData);
    return result;
  }

  // 결제 성공 업데이트
  async updatePaymentSuccess(orgData, result) {
    return {
      ...orgData,
      card_no: result.outCardNo,
      auth_no: result.outAuthNo,
      auth_date: result.outAuthDate,
      status: 'APPROVED',
      reply_msg: result.outReplyMsg1 || '결제 성공',
      trade_req_time: result.outTradeReqTime || '',
      updated_at: new Date().toISOString()
    };
  }

  // 결제 실패 업데이트
  async updatePaymentFailure(orgData, error) {
    return {
      ...orgData,
      status: 'FAILED',
      reply_msg: error.message || '결제 실패',
      trade_req_time: error.tradeReqTime || '',
      updated_at: new Date().toISOString()
    };
  }

  // 결제 취소 업데이트
  async updatePaymentCancel(orgData, result) {
    return {
      ...orgData,
      status: 'CANCELED',
      reply_msg: result.outReplyMsg1 || '결제 취소 완료',
      trade_req_time: result.outTradeReqTime || orgData.trade_req_time,
      updated_at: new Date().toISOString()
    };
  }

  // 특정 날짜의 결제 정보 조회
  async getPaymentsByDate(date) {
    const filePath = this.getFilePath(date);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return { orders: [] };
    } catch (error) {
      return { orders: [] };
    }
  }

  // 특정 ID의 결제 정보 조회
  async getPaymentById(date, id) {
    const data = await this.getPaymentsByDate(date);
    const payment = data.orders.find(p => p.id === id);
    if (payment) return payment;
    return null;
  }

  // 파일에 저장 (시간 내림차순 정렬)
  async saveToFile(filePath, data) {
    data.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

module.exports = PaymentStore;