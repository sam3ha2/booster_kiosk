import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../models/models';
import ApiService from '../../utils/api_service';
import AppBar from '../components/AppBar';
import ArrowIcon from '../components/ArrowIcon';
import { HEADQUARTERS, STORAGE_KEYS } from '../../constants/constants';
import Utils from '../../utils/utils';

const TEST_MODE = process.env.NODE_ENV === 'development'; // 실제 배포 시 false로 변경

const ServiceOption = ({ product, onSelect }) => (
  <div className="bg-gray-800 rounded-full py-4 pl-8 pr-5 mb-2 flex justify-between items-center cursor-pointer" onClick={() => onSelect(product)}>
    <div className="w-full">
      <div className="flex justify-between">
        <h3 className="text-white font-bold text-xl">{product.name} ({product.duration}분)</h3>
        <span className="text-main font-bold ms-2 whitespace-nowrap text-xl">{product.price.toLocaleString()}원</span>
      </div>
      <p className="text-gray-400 text-base mt-1">{product.description}</p>
    </div>
    <div className="flex items-center ml-3">
      <ArrowIcon direction="right" color="text-white" size="w-8 h-8" />
    </div>
  </div>
);

const Body = ({ loading, error, products, onSelect }) => {
  if (error) {
    return (
      <div className="text-white text-center text-xl p-8 overflow-y-auto">
        <p>에러 발생: {error.message}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-white text-center text-xl p-8 overflow-y-auto">
        <p>상품 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w py-2 px-8 overflow-y-auto h-full">
      {products.map((product) => (
        <ServiceOption key={product.idx} product={product} onSelect={onSelect} />
      ))}
    </div>
  );
};

const CloseButton = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
  >
    <svg 
      className="w-6 h-6" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    </svg>
  </button>
);

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [shouldNavigateHome, setShouldNavigateHome] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await ApiService.getProducts();
        setProducts(response.list.map(p => new Product(p.idx, p.name, p.description, p.price, p.duration, p.target_mode, p.payment_rf_only)));
      } catch (err) {
        console.error('상품 목록을 불러오는데 실패했습니다:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (shouldNavigateHome) {
      navigate('/');
    }
  }, [shouldNavigateHome, navigate]);

  useEffect(() => {
    let timer;
    if (paymentStatus === 'success') {
      timer = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount === 1) {
            clearInterval(timer);
            handleClose();
            return 5;
          }
          return prevCount - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentStatus]);

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setPaymentStatus('waiting');
  };

  const processPayment = async () => {
    try {
      setPaymentStatus('processing');
      setPaymentMessage('결제 처리 중...');

      const { tranAmt, vatAmt } = Utils.getAmount(selectedProduct.price);
      const paymentParams = {
        amount: selectedProduct.price,
        tran_amt: tranAmt.toString(),
        vat_amt: vatAmt.toString(),
        svc_amt: '0',
        installment: '0',
        trade_req_date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\D/g, ''),
      };

      // 결제 요청 등록
      const paymentRecord = await window.databaseIPC.registerPayment(paymentParams);

      let paymentInfo;
      if (TEST_MODE) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
        paymentInfo = await simulatePayment(paymentParams);
        // 테스트 모드에서도 결제 성공 기록
        await window.databaseIPC.updatePaymentSuccess(paymentRecord.id, paymentParams.trade_req_date, {
          outCardNo: paymentInfo.card_number,
          outAuthNo: paymentInfo.auth_no,
          outAuthDate: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\D/g, ''),
          ontTradeReqTime: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\D/g, ''),
          outReplyMsg1: '테스트 결제 성공'
        });

        // 테스트 모드에서 결제 정보 저장
        localStorage.setItem(STORAGE_KEYS.LAST_PAYMENT, JSON.stringify({
          card_company: paymentInfo.card_company_number,
          card_number: paymentInfo.card_number,
          merchant_number: paymentInfo.merchant_number,
          transaction_id: paymentInfo.transaction_id,
          amount: paymentInfo.amount,
          tran_amount: paymentInfo.tran_amount,
          vat_amount: paymentInfo.vat_amount,
          auth_no: paymentInfo.auth_no,
          auth_date: paymentParams.trade_req_date,
        }));
      } else {
        // 실제 결제 처리
        const result = await window.paymentIPC.processApproval(paymentParams);
        if (result.isSuccess) {
          // 결제 성공 업데이트
          await window.databaseIPC.updatePaymentSuccess(paymentRecord.id, result.outAuthDate, result);
          paymentInfo = {
            amount: paymentParams.amount,
            tran_amount: paymentParams.tran_amount,
            vat_amount: paymentParams.vat_amount,
            card_company_number: result.outCatId,
            card_number: result.outCardNo,
            merchant_number: result.outMerchantNo,
            transaction_id: result.outTranId,
            auth_no: result.outAuthNo,
            auth_date: result.outAuthDate,
            type: 'CARD',
          };

          // 실제 결제 성공 시 결제 정보 저장
          localStorage.setItem(STORAGE_KEYS.LAST_PAYMENT, JSON.stringify(paymentInfo));
        } else {
          // 결제 실패 업데이트
          await window.databaseIPC.updatePaymentFailure(paymentRecord.id, result.outAuthDate, {
            message: result.outReplyMsg1 || '결제 실패'
          });
          throw new Error(result.outReplyMsg1 || '결제 실패');
        }
      }

      setPaymentMessage('예약 생성 중...');
      // 예약 로직 (주석 처리된 부분)

      console.log('selectedProduct : ', selectedProduct)
      // 세차기 동작 시작
      try {
        const result = await window.machineIPC.startWash(selectedProduct.targetMode);
        console.log('세차기 제어 결과:', result);
        if (result.success) {
          setPaymentStatus('success');
        } else {
          throw new Error(result.error || '세차기 시작 실패');
        }
      } catch (error) {
        console.error('세차기 시작 중 오류 발생:', error);
        throw new Error('세차기를 시작할 수 없습니다. 관리자에게 문의해주세요.');
      }
    } catch (error) {
      console.error('결제 또는 예약 중 오류가 발생했습니다:', error);
      setPaymentStatus('failed');
      setPaymentMessage('결제 실패: ' + error.message);
    }
  };

  const simulatePayment = (paymentParams) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          auth_no: 'SIM' + Math.random().toString(36).substr(2, 9),
          card_number: Math.floor(100000 + Math.random() * 900000),
          card_company_number: '01',
          type: 'CARD',
          amount: paymentParams.amount,
          tran_amount: paymentParams.tran_amt,
          vat_amount: paymentParams.vat_amt,
        });
      }, 1000); // 1초 후 결제 완료 시뮬레이션
    });
  };

  const handleClose = () => {
    setPaymentStatus(null);
    setCountdown(5);
    setShouldNavigateHome(true);
  };

  const handlePrintReceipt = async () => {
    try {
      const lastPayment = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_PAYMENT));
      if (!lastPayment) {
        console.error('결제 정보를 찾을 수 없습니다.');
        return;
      }

      await window.printerIPC.printReceipt({
        shop: JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPT_INFO)),
        product: selectedProduct,
        payment: lastPayment,
        headquarters: HEADQUARTERS
      });

      console.log('영수증 출력 완료');
    } catch (error) {
      console.error('영수증 출력 실패:', error);
    } finally {
      handleClose();
    }
  };

  const renderPaymentModal = () => {
    if (paymentStatus === 'waiting') {
      if (!TEST_MODE) {
        processPayment();
        return null;
      }
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 mx-8 rounded-3xl max-w-md w-full text-white relative">
            <CloseButton onClick={() => setPaymentStatus(null)} />
            <h2 className="text-2xl font-bold mb-4">결제 대기 중</h2>
            <p>카드를 투입해 주세요.</p>
            <button onClick={processPayment} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
              결제 시뮬레이션
            </button>
          </div>
        </div>
      );
    }
    if (paymentStatus === 'processing') {
      if (!TEST_MODE) {
        return (
          <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-auto">
            <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}></div>
          </div>
        );
      }
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white relative">
            <h2 className="text-2xl font-bold mb-4">결제 처리 중</h2>
            <p>{paymentMessage}</p>
          </div>
        </div>
      );
    }
    if (paymentStatus === 'failed') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white relative">
            <CloseButton onClick={() => setPaymentStatus(null)} />
            <h2 className="text-2xl font-bold mb-4">결제 실패</h2>
            <p>{paymentMessage}</p>
            <button onClick={() => setPaymentStatus(null)} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">
              닫기
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="bg-black h-full flex flex-col">
      <div className="sticky top-0 flex-none bg-black">
        <AppBar 
          label="상품 선택"
          showBack={true}
          onBack={handleBack}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <Body 
          loading={loading}
          error={error}
          products={products}
          onSelect={selectProduct}
        />
      </div>
      {renderPaymentModal()}
      {paymentStatus === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white relative">
            <CloseButton onClick={handleClose} />
            <h2 className="text-2xl font-bold mb-4 text-center">결제가 완료되었습니다.</h2>
            <p className="mb-4 text-center">모니터 오른쪽 하단에 카드를 회수해 주세요.</p>
            <div className="flex justify-center mb-6">
              <img src="/path-to-success-icon.png" alt="Success Icon" className="w-24 h-24" />
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={handleClose} className="bg-red-500 text-white px-6 py-2 rounded-full w-[48%]">
                닫기 ({countdown})
              </button>
              <button onClick={handlePrintReceipt} className="bg-green-500 text-white px-6 py-2 rounded-full w-[48%]">
                영수증 출력
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
