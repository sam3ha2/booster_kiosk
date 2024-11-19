import log from 'electron-log';
import KisSocket from './kis/kis_socket.js';

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
      throw error;
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
   * @param {Object} params
   * @param {string} params.tran_amt - 거래금액
   * @param {string} params.vat_amt - 부가세
   * @param {string} params.svc_amt - 봉사료 
   * @param {string} params.installment - 할부개월수
   */
  async requestPayment(params) {
    return await this.processPayment({...params, is_approval: true});
  }

  /**
   * 결제 취소
   * @param {Object} params
   * @param {string} params.tran_amt - 거래금액
   * @param {string} params.vat_amt - 부가세
   * @param {string} params.svc_amt - 봉사료
   * @param {string} params.installment - 할부개월수
   * @param {string} params.org_auth_no - 원거래 승인번호
   * @param {string} params.org_auth_date - 원거래 승인일자
   */
  async requestCancel(params) {
    return await this.processPayment({ ...params, is_approval: false });
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

  getDeviceStatus() {
    return {
      connected: this.van.webSocket.readyState == WebSocket.OPEN
    };
  }
}

export default PaymentManager;
