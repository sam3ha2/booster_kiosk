import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../models/models';
import ApiService from '../../utils/api_service';

const ServiceOption = ({ product, onSelect }) => (
  <div className="bg-gray-800 rounded-lg p-4 mb-4 flex justify-between items-center cursor-pointer" onClick={() => onSelect(product)}>
    <div>
      <h3 className="text-white font-bold">{product.name} ({product.duration}분)</h3>
      <p className="text-gray-400 text-sm">{product.description}</p>
    </div>
    <div className="flex items-center">
      <span className="text-green-400 font-bold mr-2">{product.price.toLocaleString()}원</span>
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
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

  const goBack = () => {
    navigate(-1);
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setPaymentStatus('waiting');
  };

  const processPayment = async () => {
    try {
      setPaymentStatus('processing');
      setPaymentMessage('결제 처리 중...');

      // 실제 환경에서는 여기에 카드 결제 시퀀스 로직을 구현합니다.
      // 개발 환경에서는 시뮬레이션된 결제 정보를 사용합니다.
      const paymentInfo = await simulatePayment();

      setPaymentMessage('예약 생성 중...');
      // 예약 요청
      const reservationResponse = await ApiService.createReservation({
        tel: '010-0000-0000', // TODO: 실제 사용자 전화번호 입력 받기
        product_idx: selectedProduct.idx,
        payment: paymentInfo,
        status: 'COMPLETE'
      });

      console.log('예약이 완료되었습니다:', reservationResponse);

      // 세차기 동작 시작
      try {
        const result = await window.machineIPC.carWashCommand({
          command: 'start-wash',
          machineId: '0',
          data: { mode: selectedProduct.targetMode }
        });
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

  const simulatePayment = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          approval_number: 'SIM' + Math.random().toString(36).substr(2, 9),
          card_number: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
          card_company_number: '01',
          type: 'CARD',
          amount: selectedProduct.price
        });
      }, 1000); // 1초 후 결제 완료 시뮬레이션
    });
  };

  useEffect(() => {
    let timer;
    if (paymentStatus === 'success') {
      timer = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount === 1) {
            clearInterval(timer);
            setPaymentStatus(null);
            return 5;
          }
          return prevCount - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentStatus]);

  const handleClose = () => {
    setPaymentStatus(null);
    setCountdown(5);
  };

  const handlePrintReceipt = () => {
    // 영수증 출력 로직
    handleClose();
  };

  const renderPaymentModal = () => {
    if (paymentStatus === 'waiting') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
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
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
            <h2 className="text-2xl font-bold mb-4">결제 처리 중</h2>
            <p>{paymentMessage}</p>
          </div>
        </div>
      );
    }
    if (paymentStatus === 'failed') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
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

  if (error) {
    return (
      <div className="text-white text-center p-4">
        <p>에러 발생: {error.message}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-white text-center p-4">
        <p>상품 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <div className="relative mb-6">
          <img src="/path-to-your-image.jpg" alt="Car wash" className="w-full rounded-lg" />
          <button onClick={goBack} className="absolute top-4 left-4 bg-white rounded-full p-2">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <h2 className="text-white text-2xl font-bold mb-6">상품 선택</h2>
        {products.map((product) => (
          <ServiceOption key={product.idx} product={product} onSelect={selectProduct} />
        ))}
      </div>
      {renderPaymentModal()}
      {paymentStatus === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white relative">
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
