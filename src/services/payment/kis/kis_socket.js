import log from 'electron-log';
import WebSocket from 'ws';

class KisSocket {
  constructor() {
    this.webSocket = null;
    this.currentCallback = null;
  }

  /**
   * WebSocket 연결
   */
  connect(endpoint = '', protocol = 'ws') {
    return new Promise((resolve, reject) => {
      try {
        const webSocketURL =
          protocol === 'wss'
            ? `wss://127.0.0.1:1517/${endpoint}`
            : `ws://127.0.0.1:1516/${endpoint}`;

        log.info(webSocketURL + ' Connecting...');

        this.webSocket = new WebSocket(webSocketURL);
        this.webSocket.EnableRedirect = true;

        this.webSocket.on('open', () => {
          log.info('WebSocket OPEN');
          resolve();
        });

        this.webSocket.on('close', () => {
          log.info('WebSocket CLOSE');
        });

        this.webSocket.on('error', (error) => {
          log.error('WebSocket ERROR:', error);
          reject(error);
        });

        this.webSocket.on('message', (data) => {
          log.info('WebSocket MESSAGE');
          try {
            const response = JSON.parse(data);

            if (response.message) {
              log.info('KIS 응답:', response);
              return;
            }

            if (this.currentCallback) {
              this.currentCallback(response);
              this.currentCallback = null;
            }
          } catch (error) {
            log.error('메시지 파싱 에러:', error);
          }
        });
      } catch (error) {
        log.error('WebSocket 연결 실패:', error);
        reject(error);
      }
    });
  }

  /**
   * WebSocket 연결 종료
   */
  disconnect() {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.close();
    }
  }

  /**
   * 메시지 전송
   */
  sendMessage(message) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(message);
    }
  }

  /**
   * 결제 승인
   */
  approval(params) {
    return new Promise((resolve, reject) => {
      try {
        this.currentCallback = (response) => {
          resolve(this.parseResponse(response));
        };

        const payload = this.createPaymentPayload(params);
        this.sendMessage(JSON.stringify(payload));
      } catch (error) {
        log.error('결제 요청 실패:', error);
        reject(error);
      }
    });
  }

  /**
   * Ping 전송
   */
  sendPing() {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.Ping('PingTest');
    }
  }

  /**
   * Agent 중지
   */
  stopAgent() {
    this.sendMessage("{'KIS_Agent_Stop':{}}");
  }

  /**
   * WebSocket 연결 상태 확인
   */
  isConnected() {
    return this.webSocket && this.webSocket.readyState === WebSocket.OPEN;
  }

  /**
   * 결제 요청 생성
   */
  createPaymentPayload({
    tran_amt = '0',
    vat_amt = '0',
    svc_amt = '0',
    installment = '0',
    auth_no = '',
    auth_date = '',
    is_approval = true,
  }) {
    return {
      KIS_ICApproval: {
        inTranCode: 'NV',
        inTradeType: is_approval ? 'D1' : 'D2',
        inTranAmt: tran_amt,
        inVatAmt: vat_amt,
        inSvcAmt: svc_amt,
        inInstallment: installment,
        inOrgAuthNo: auth_no,
        inOrgAuthDate: auth_date.slice(-6),
      },
    };
  }

  /**
   * 응답 파싱
   */
  parseResponse(response) {
    return {
      outRtn: response.outRtn,
      outAgentCode: response.outAgentCode,
      outReplyCode: response.outReplyCode,
      outReplyMsg1: response.outReplyMsg1,
      outReplyMsg2: response.outReplyMsg2,
      outCatId: response.outCatId || '',
      outWCC: response.outWCC || '',
      outCardNo: response.outCardNo || '',
      outEightCardNo: response.outEightCardNo || '',
      outAuthNo: response.outAuthNo || '',
      outReplyDate: response.outReplyDate || '',
      outTradeNum: response.outTradeNum || '',
      outTradeReqDate: response.outTradeReqDate || '',
      outTradeReqTime: response.outTradeReqTime || '',
      outTradeType: response.outTradeType || '',
      outVanKey: response.outVanKey || '',
      outAccepterCode: response.outAccepterCode || '',
      outAccepterName: response.outAccepterName || '',
      outIssuerCode: response.outIssuerCode || '',
      outIssuerName: response.outIssuerName || '',
      outMerchantRegNo: response.outMerchantRegNo || '',
      isSuccess: response.outRtn === 0 && response.outAgentCode === '0000',
    };
  }
}

export default KisSocket;
