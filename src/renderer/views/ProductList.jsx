import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../models/models';
import ApiService from '../../utils/api_service';

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const isDevelopment = process.env.NODE_ENV === 'development';

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
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('control-car-wash', {
          action: 'start',
          machineId: '0',
          mode: selectedProduct.targetMode // 선택된 제품의 target_mode를 세차 모드로 사용
        });
        console.log('세차기가 성공적으로 시작되었습니다.');
        setPaymentStatus('success');
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

  const renderPaymentModal = () => {
    switch (paymentStatus) {
      case 'waiting':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
              <h2 className="text-2xl font-bold mb-4">신용카드를 넣어주세요.</h2>
              <p className="mb-4">모니터 오른쪽 하단에 카드를 삽입 또는 터치해주세요.</p>
              <div className="flex justify-center">
                <img src="/path-to-card-icon.png" alt="Card Icon" className="w-24 h-24" />
              </div>
              <button onClick={processPayment} className="mt-6 bg-green-500 text-white px-6 py-2 rounded-full w-full">
                결제 시작하기
              </button>
            </div>
          </div>
        );
      case 'processing':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
              <h2 className="text-2xl font-bold mb-4">{paymentMessage}</h2>
              <div className="flex justify-center">
                <img src="/path-to-loading-icon.png" alt="Loading" className="w-24 h-24 animate-spin" />
              </div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
              <h2 className="text-2xl font-bold mb-4">결제가 완료되었습니다.</h2>
              <p className="mb-4">모니터 오른쪽 하단에 카드를 회수해 주세요.</p>
              <div className="flex justify-center">
                <img src="/path-to-success-icon.png" alt="Success Icon" className="w-24 h-24" />
              </div>
              <button onClick={() => navigate('/')} className="mt-6 bg-green-500 text-white px-6 py-2 rounded-full w-full">
                5초 후 자동으로 닫힙니다.
              </button>
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-md w-full text-white">
              <h2 className="text-2xl font-bold mb-4">결제가 실패했습니다.</h2>
              <p className="mb-4">{paymentMessage}</p>
              <div className="flex justify-center">
                <img src="/path-to-error-icon.png" alt="Error Icon" className="w-24 h-24" />
              </div>
              <button onClick={() => setPaymentStatus('waiting')} className="mt-6 bg-green-500 text-white px-6 py-2 rounded-full w-full">
                결제 재시도하기
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
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
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-1 p-4">
        <div className="flex items-center mb-4">
          <button onClick={goBack} className="bg-white rounded-full p-2 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">상품 선택</h2>
        </div>
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.idx} className="bg-gray-800 rounded-xl p-4 flex justify-between items-center" onClick={() => selectProduct(product)}>
              <div>
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="text-sm text-gray-400">{product.description}</p>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl font-bold mr-2">{product.price.toLocaleString()}원</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      {renderPaymentModal()}
    </div>
  );
};

export default ProductList;