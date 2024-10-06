import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrScanner } from '@yudiel/react-qr-scanner';
import ApiService from '../../utils/api_service';

const Home = () => {
  const navigate = useNavigate();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showUsageGuide, setShowUsageGuide] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  const startWash = () => {
    navigate('/products');
  };

  const checkReservation = () => {
    setShowQrScanner(true);
  };

  const closeQrScanner = () => {
    setShowQrScanner(false);
  };

  const toggleUsageGuide = () => {
    setShowUsageGuide(!showUsageGuide);
  };

  const onDecode = async (result) => {
    if (result) {
      try {
        const [qrIdx, qrCreatedAt, qrChecksum] = result.split('|');
        
        const reservationResponse = await ApiService.getReservation({
          qr_idx: qrIdx,
          qr_created_at: qrCreatedAt,
          qr_checksum: qrChecksum
        });
        
        if (reservationResponse.item) {
          const updateResponse = await ApiService.updateReservationStatus(
            reservationResponse.item.idx,
            'COMPLETE',
            null
          );
          
          if (updateResponse.type === 'SUCCESS') {
            const controlResponse = await ApiService.controlCarWash('START');
            
            if (controlResponse.success) {
              alert('예약이 확인되었습니다. 세차를 시작합니다.');
            } else {
              alert('세차기 시작에 실패했습니다. 관리자에게 문의해주세요.');
            }
          } else {
            alert('예약 상태 업데이트에 실패했습니다. 다시 시도해주세요.');
          }
        } else {
          alert('유효하지 않은 QR 코드입니다.');
        }
        
        closeQrScanner();
      } catch (error) {
        console.error('예약 확인 중 오류가 발생했습니다:', error);
        alert('예약 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex-1 bg-black text-white flex items-center justify-center rounded-b-3xl overflow-hidden">
        <p className="text-2xl">영상 광고 영역</p>
      </div>
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-green-500 mb-4">BOOSTER</div>
        <h1 className="text-2xl font-semibold text-center mb-8">
          안녕하세요. 고객님<br />씻자 진주점입니다.
        </h1>
        <div className="flex space-x-4 mb-8">
          <button
            onClick={startWash}
            className="bg-gray-800 text-white px-6 py-4 rounded-2xl flex flex-col items-center transition duration-300 hover:bg-gray-700"
          >
            <span>자동세차</span>
            <span>현장결제</span>
            <span className="mt-2 text-2xl">→</span>
          </button>
          <button
            onClick={checkReservation}
            className="bg-gray-800 text-white px-6 py-4 rounded-2xl flex flex-col items-center transition duration-300 hover:bg-gray-700"
          >
            <span>자동세차</span>
            <span>QR 확인</span>
            <span className="mt-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">QR</span>
          </button>
        </div>
        <button onClick={toggleUsageGuide} className="text-green-500 underline">
          부스터 키오스크 사용 안내
        </button>
      </div>

      {showQrScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full text-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">QR 코드를 스캔해주세요</h2>
              <button onClick={closeQrScanner} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <p className="mb-4">예약 확인을 위해 QR 코드를 카메라에 보여주세요.</p>
            {isDevelopment ? (
              <QrScanner
                onDecode={onDecode}
                onError={(error) => console.log(error?.message)}
                className="w-full h-64"
              />
            ) : (
              <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
                <p>카메라가 활성화되었습니다. QR 코드를 스캔해주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showUsageGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-3xl max-w-2xl w-full text-white relative">
            <button onClick={toggleUsageGuide} className="absolute top-4 right-4 text-white">
              <span className="text-3xl">&times;</span>
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">부스터 키오스크 사용 안내</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">1</div>
                <p>앱 예약, 구독은 '자동세차 QR확인' 버튼으로 현장에서 결제할 경우 '자동세차 현장결제' 버튼을 눌러주세요.</p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">2</div>
                <p>QR확인은 모니터 왼쪽 하단에 30cm 거리 안에서 스캔하고 세차를 진행해 주세요.</p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">2</div>
                <p>현장 결제는 원하는 상품을 누르고 전화번호 입력 후 모니터 오른쪽 하단 카드결제하고 세차를 진행해 주세요.</p>
              </div>
            </div>
            <div className="mt-8 bg-gray-700 p-4 rounded-xl">
              <h3 className="text-green-500 font-bold mb-2">이 시대 자동세차를 위한 구독요금제</h3>
              <p className="text-xl font-bold">요금은 <span className="text-green-500">더 낮게</span> 세차는 <span className="text-green-500">더 많이</span></p>
              <p className="text-xl font-bold"><span className="text-green-500">자동세차 구독</span></p>
              <p className="text-sm mt-2">앱에서 구독을 확인하세요.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;