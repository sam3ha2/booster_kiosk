import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../utils/api_service';
import AppBar from '../components/AppBar';
import CarWashStatus from '../components/CarWashStatus';
import boosterIcon from '../../assets/images/ic_booster_logo.png';
import ArrowIcon from '../components/ArrowIcon';

// 새로운 HomeButton 컴포넌트
const HomeButton = ({ onClick, disabled, icon, text, subText }) => (
  <button
    onClick={onClick}
    className={`bg-gray-800 text-white px-2 py-0 rounded-full flex flex-col items-center transition duration-300 w-44 h-60 justify-center ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
    }`}
    disabled={disabled}
  >
    <span className="text-2xl font-normal mt-4">{text}</span>
    <span className="text-2xl font-bold text-main">{subText}</span>
    <span className="mt-10 text-2xl">{icon}</span>
  </button>
);

const Home = () => {
  const navigate = useNavigate();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showUsageGuide, setShowUsageGuide] = useState(false);
  const [carWashState, setCarWashState] = useState(null);
  const isDevelopment = process.env.NODE_ENV === 'development';

  const statusUpdateListener = useCallback((data) => {
    console.log('세차기 상태 업데이트:', data);
    setCarWashState(data);
  }, []);

  useEffect(() => {
    window.machineIPC.onStatusUpdate(statusUpdateListener);

    const qrCodeListener = (data) => {
      if (isWashing) return;
      console.log("QR 코드 스캔 데이터:", data);
      window.scannerIPC.beep();
      window.scannerIPC.toggleLight(false);
      processQrCode(data);
    };

    const scannerErrorListener = (error) => {
      console.error("스캐너 오류:", error);
      alert('QR 스캐너 오류가 발생했습니다. 다시 시도해주세요.');
    };

    window.scannerIPC.onQrCodeScanned(qrCodeListener);
    window.scannerIPC.onScannerError(scannerErrorListener);
    
    // 개발 환경에서 초기 상태 설정
    if (isDevelopment && !carWashState) {
      setCarWashState({
        state: {
          currentStep: '없음',
          remainingTime: 0,
          progress: 0,
          error: false
        }
      });
    }

    return () => {
      window.machineIPC.offStatusUpdate(statusUpdateListener);
      window.scannerIPC.offQrCodeScanned(qrCodeListener);
      window.scannerIPC.offScannerError(scannerErrorListener);
    };
  }, [statusUpdateListener]);

  const startWash = () => {
    navigate('/products');
  };

  const checkReservation = () => {
    setShowQrScanner(true);
  };

  const closeQrScanner = () => {
    setShowQrScanner(false);
  };

  const processQrCode = async (qrData) => {
    try {
      const qrCodeData = JSON.parse(qrData);

      console.log(qrCodeData);
      const reservationResponse = await ApiService.getReservation({
        qr_idx: qrCodeData.qr_idx,
        qr_created_at: qrCodeData.qr_created_at,
        qr_checksum: qrCodeData.qr_checksum,
        is_test: isDevelopment ? 'Y' : null,
      });
      
      if (reservationResponse.item) {
        const updateResponse = await ApiService.updateReservationStatus(
          reservationResponse.item.idx,
          {
            status: 'COMPLETE',
            hipass_idx: null,
            is_test: isDevelopment ? 'Y' : null,
          }
        );
        
        if (updateResponse.type === 'SUCCESS') {
          const controlResponse = await window.machineIPC.startWash(reservationResponse.item.product.target_mode);
          
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
    } catch (error) {
      console.error('예약 확인 중 오류가 발생했습니다:', error);
      alert('예약 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      closeQrScanner();
    }
  };

  const toggleUsageGuide = () => {
    setShowUsageGuide(!showUsageGuide);
  };

  const isWashing = carWashState?.status !== 0 && carWashState?.status !== 1 && carWashState?.status !== undefined;

  return (
    <div className="h-full flex-1 p-0 flex flex-col items-center relative">
      <AppBar image={boosterIcon} />

      <h1 className="text-2xl font-semibold text-center mt-4 mb-8">
        안녕하세요. 고객님<br />{ localStorage.getItem('shop_name') || '씻자'}입니다.
      </h1>

      {isWashing ? (
        // 세차 중일 때 표시되는 UI
        <div className="text-center">
          <h2 className="text-xl font-bold text-green-500 mb-4">세차가 진행 중입니다</h2>
          <CarWashStatus carWashState={carWashState} isDevelopment={isDevelopment} />
        </div>
      ) : (
        // 세차 중이 아닐 때 표시되는 UI
        <>
          <div className="flex">
            <HomeButton
              onClick={startWash}
              disabled={false}
              text="자동세차"
              subText="현장결제"
              icon={<ArrowIcon direction="right" color="text-white" size="w-8 h-8" />}
            />
          </div>
        </>
      )}
      <button onClick={toggleUsageGuide} className="fixed bottom-0 bg-gray-800 py-4 w-full text-white font-bold text-xl rounded-t-3xl">
        부스터 키오스크 사용 안내
      </button>

      {/* 모달 관련 코드 */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full text-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">QR 코드를 스캔해주세요</h2>
              <button onClick={closeQrScanner} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <p className="mb-4">예약 확인을 위해 QR 코드를 스캐너에 보여주세요.</p>
            <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
              <p>스캐너가 활성화되었습니다. QR 코드를 스캔해주세요.</p>
            </div>
          </div>
        </div>
      )}

      {showUsageGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 mx-4 rounded-3xl max-w-2xl w-full text-white relative">
            <button onClick={toggleUsageGuide} className="absolute top-4 right-4 text-white">
              <span className="text-3xl">&times;</span>
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">부스터 키오스크 사용 안내</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">1</div>
                <p>앱 예약, 구독은 '자동세차 QR확인' 버튼을 현장에서 결제할 경우 '자동세차 현장결제' 버튼을 눌러주세요.</p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">2</div>
                <p>QR확인은 모니터 왼쪽 하단에 30cm 거리 안에서 스캔하고 세차를 진행해 주세요.</p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">3</div>
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
          {carWashState.error && <p className="text-red-500">오류: {carWashState.error}</p>}
        </div>
      )}
    </div>
  );
};

export default Home;
