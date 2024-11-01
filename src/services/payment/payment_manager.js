const log = require('electron-log');
const KisSocket = require('./kis/kis_socket');

class PaymentManager {
  constructor() {
    this.van = new KisSocket();
  }

  /**
   * 결제 모듈 초기화
   */
  async initialize() {
    try {
      await this.van.connect();
      return true;
    } catch (error) {
      log.error('결제 모듈 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 결제 모듈 종료
   */
  terminate() {
    try {
      this.van.disconnect();
      return true;
    } catch (error) {
      log.error('결제 모듈 종료 실패:', error);
      return false;
    }
  }

  /**
   * 결제 처리
   */
  async processPayment(params) {
    try {
      await this.initialize();
      return await this.van.approval(params);
    } catch (error) {
      log.error('결제 처리 실패:', error);
      throw error;
    } finally {
      this.terminate();
    }
  }

  /**
   * 결제 승인
   */
  async requestPayment(params) {
    return await this.processPayment({...params, isApproval: true});
  }

  /**
   * 결제 취소
   */
  async requestCancel(params) {
    return await this.processPayment({...params, isApproval: false});
  }

  /**
   * 상태 확인
   */
  async checkStatus() {
    try {
      this.van.sendPing();
      return true;
    } catch (error) {
      log.error('상태 확인 실패:', error);
      return false;
    }
  }
}

module.exports = PaymentManager;