const KisSocket = require('./kis_socket');

async function testPayment() {
  const payment = new KisSocket();

  // 결제 승인 테스트
  async function approvePayment() {
    try {
      console.log('결제 승인 시작...');
      const result = await payment.approval({
        tranAmt: '1004',
        vatAmt: '100',
        svcAmt: '0',
        installment: '0',
        isApproval: true
      });


      if (result.isSuccess) {
        console.log('결제 승인 성공:', {
          카드번호: result.outCardNo,
          승인번호: result.outAuthNo,
          승인일시: result.outReplyDate,
          응답메시지: result.outReplyMsg1
        });
        
        // 승인 성공 시 취소 테스트 실행
        setTimeout(() => {
          cancelPayment(result.outAuthNo, result.outReplyDate.slice(-6));
        }, 2000);
      } else {
        console.log('결제 승인 실패:', {
          에러코드: result.outReplyCode,
          에러메시지: result.outReplyMsg1
        });
      }
    } catch (error) {
      console.error('결제 처리 실패:', error.message);
    }
  }

  // 결제 취소 테스트
  async function cancelPayment(authNo, authDate) {
    try {
      console.log('결제 취소 시작...');
      const result = await payment.approval({
        tranAmt: '1004',
        vatAmt: '100',
        svcAmt: '0',
        installment: '0',
        orgAuthNo: authNo,
        orgAuthDate: authDate,
        isApproval: false
      });
      
      if (result.isSuccess) {
        console.log('결제 취소 성공:', {
          취소승인번호: result.outAuthNo,
          취소일시: result.outReplyDate,
          응답메시지: result.outReplyMsg1
        });
      } else {
        console.log('결제 취소 실패:', {
          에러코드: result.outReplyCode,
          에러메시지: result.outReplyMsg1
        });
      }
    } catch (error) {
      console.error('결제 취소 실패:', error.message);
    } finally {
      // 테스트 완료 후 연결 종료
      payment.disconnect();
      process.exit(0);
    }
  }

  try {
    // WebSocket 연결 시작
    await payment.connect();
    console.log('WebSocket 연결 성공');
    
    // 승인 테스트 실행
    await approvePayment();
    // await cancelPayment('61394728', '241101');

    payment.disconnect();

  } catch (error) {
    console.error('테스트 실패:', error);
    process.exit(1);
  }
}

// 테스트 실행
testPayment();

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('테스트 중단...');
  process.exit(0);
});