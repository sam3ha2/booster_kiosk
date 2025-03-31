import log from 'electron-log/renderer';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../utils/api_service';
import AppBar from '../components/AppBar';
import CarWashStatus from '../components/CarWashStatus';
import boosterIcon from '../../assets/images/ic_booster_logo.png';
import btn_qr from '../../assets/images/btn_qr.svg';
import ArrowIcon from '../components/ArrowIcon';
import { STORAGE_KEYS, RECEIPT_INFO_REFRESH_TIME } from '../../constants/constants';
import { Usage } from '../components/Usage';
import { BottomSheet } from '../components/BottomSheet';
import { QrScan } from '../components/QrScan';

let isFirstTime = true;
const isDiscountable = true;

// 새로운 HomeButton 컴포넌트
const HomeButton = ({ onClick, disabled, icon, text, subText }) => (
  <button
    onClick={onClick}
    className={`bg-gray-800 text-white px-2 py-0 rounded-full flex flex-col items-center transition duration-300 w-44 h-64 justify-center ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
    }`}
    disabled={disabled}
  >
    <div className='flex-1 flex flex-col justify-end items-center mb-2'>
      <span className='text-2xl font-normal'>{text}</span>
      <span className='text-2xl font-bold text-main'>{subText}</span>
    </div>

    <div className='flex-1 flex justify-start items-center mb-4'>
      <span className='text-2xl'>{icon}</span>
    </div>
  </button>
);

const Home = () => {
  const navigate = useNavigate();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showInfoMessage, setShowInfoMessage] = useState(null);
  const [showUsageGuide, setShowUsageGuide] = useState(false);
  const [carWashState, setCarWashState] = useState(null);
  const useAppOnly = localStorage.getItem(STORAGE_KEYS.USE_ONLY_APP) === 'true';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 영수증 정보 로드
  useEffect(() => {
    const loadReceiptInfo = async () => {
      try {
        const lastUpdated = localStorage.getItem(STORAGE_KEYS.RECEIPT_INFO_UPDATED_AT);
        const now = Date.now();

        // 저장된 정보가 없거나, 마지막 업데이트로부터 6시간이 지났으면 새로 로드
        if (isFirstTime || !lastUpdated || (now - parseInt(lastUpdated)) > RECEIPT_INFO_REFRESH_TIME) {
          isFirstTime = false;
          console.log('영수증 정보 새로 로드');
          const response = await ApiService.getReceiptInfo();

          if (response.item) {
            localStorage.setItem(STORAGE_KEYS.RECEIPT_INFO, JSON.stringify(response.item));
            localStorage.setItem(STORAGE_KEYS.SHOP_NAME, response.item.shop_name || '씻자');
            localStorage.setItem(STORAGE_KEYS.RECEIPT_INFO_UPDATED_AT, now.toString());
            console.log('영수증 정보 저장 완료:', response.item);
          }
        } else {
          console.log('캐시된 영수증 정보 사용');
        }
      } catch (error) {
        console.error('영수증 정보 로드 실패:', error);
      }
    };

    loadReceiptInfo();

    const qrCodeListener = (data) => {
      if (isWashing || showInfoMessage) return;
      log.info("QR 코드 스캔 데이터:", data);
      window.scannerIPC.beep();
      processQrCode(data);
    };

    const scannerErrorListener = (error) => {
      log.error("스캐너 오류:", error);
      alert(`QR 스캐너 오류가 발생했습니다. 다시 시도해주세요.(${error})`);
    };

    window.scannerIPC.onQrCodeScanned(qrCodeListener);
    window.scannerIPC.onScannerError(scannerErrorListener);

    return () => {
      window.scannerIPC.offQrCodeScanned();
      window.scannerIPC.offScannerError(scannerErrorListener);
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const statusUpdateListener = useCallback((data) => {
    if (data.status !== carWashState?.status) {
      console.log(`[${new Date().toLocaleTimeString('es-US', {hour12: false})}] 세차기 상태 업데이트:`, data);
      setCarWashState(data);
    }
  }, []);

  useEffect(() => {
    window.machineIPC.onStatusUpdate(statusUpdateListener);

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
    };
  }, [statusUpdateListener]);

  useEffect(() => {
    window.scannerIPC.toggleLight(showQrScanner);
  }, [showQrScanner]);

  const moveToSelectProductPage = (discount = 0) => {
    navigate('/products', { state: { discount } });
  };

  const closeQrScanner = () => {
    setShowQrScanner(false);
  };

  const processQrCode = async (qrData) => {
    try {
      const qrCodeData = JSON.parse(qrData);
      log.info(qrCodeData);

      closeQrScanner();
      setShowInfoMessage('예약 확인 중입니다...');
      // 예약 QR 코드인 경우
      if (qrCodeData.qr_idx && qrCodeData.qr_created_at && qrCodeData.qr_checksum) {
        const targetMode = await getReservedTargetMode(qrCodeData);
        log.info('예약된 세차 모드:', targetMode);
        setShowInfoMessage('기기 시동 중입니다...');
        const controlResponse = await window.machineIPC.startWash(targetMode);

        if (controlResponse.success) {
          log.info('예약이 확인되었습니다. 세차를 시작합니다.');
        } else {
          log.error('세차기 시작에 실패했습니다:', controlResponse.error);
          alert('세차기 시작에 실패했습니다. 관리자에게 문의해주세요.');
        }
      }
      // 세차 할인 QR 코드인 경우
      else if (isDiscountable && qrCodeData.discount && qrCodeData.issue_date) {
        moveToSelectProductPage(qrCodeData.discount);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        log.error('QR 코드 데이터 구문 분석 오류:', error);
        alert('QR 코드 형식이 올바르지 않습니다. 다시 시도해주세요.');
      } else {
        log.error(error);
        alert(`세차기 시작 중 오류가 발생했습니다. 다시 시도해주세요.(${error})`);
      }
    } finally {
      setShowInfoMessage(null);
    }
  }

  const getReservedTargetMode = async (qrData) => {
    try {
      const reservationResponse = await ApiService.getReservation({
        ...qrData,
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
          return reservationResponse.item.product.target_mode;
        } else {
          throw new Error('예약 상태 업데이트 실패');
        }
      } else {
        throw new Error('유효하지 않은 QR 코드');
      }
    } catch (error) {
      throw new Error(`예약 확인 중 오류가 발생했습니다. 다시 시도해주세요.\n(${error.message})`);
    }
  };

  const toggleUsageGuide = () => {
    setShowUsageGuide(!showUsageGuide);
  };

  const isWashing = carWashState?.status !== 0 && carWashState?.status !== undefined;

  return (
    <div className="h-full flex-1 p-0 flex flex-col items-center relative">
      <AppBar image={boosterIcon} />

      <h1 className="text-2xl font-semibold text-center mt-4 mb-8">
        안녕하세요. 고객님<br />{ localStorage.getItem(STORAGE_KEYS.SHOP_NAME) || '씻자'}입니다.
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
        <div className="flex space-x-4">
          {!useAppOnly && (
            <HomeButton
              onClick={() => moveToSelectProductPage()}
              disabled={false}
              text="자동세차"
              subText="현장결제"
              icon={<ArrowIcon direction="right" color="text-white" size="w-8 h-8" />}
            />
          )}
          <HomeButton
            onClick={() => setShowQrScanner(true)}
            disabled={false}
            text="자동세차"
            subText="QR확인"
            icon={<img src={btn_qr} alt="QR" className="" />}
          />
        </div>
        </>
      )}
      <button onClick={toggleUsageGuide} className="fixed bottom-0 bg-gray-800 py-4 w-full text-white font-bold text-xl rounded-t-3xl">
        부스터 키오스크 사용 안내
      </button>

      {/* 예약 확인 모달 관련 코드 */}
      {showInfoMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full text-white text-center">
            <div className="flex justify-center items-center">
              <h2 className="text-xl font-bold">{showInfoMessage}</h2>
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        isShow={showQrScanner}
        toggle={closeQrScanner}
        title="QR을 스캐너에 보여주세요."
        withHandleBar={true}
        child={<QrScan />}
      />
      <BottomSheet
        isShow={showUsageGuide}
        toggle={toggleUsageGuide}
        title="부스터 키오스크 사용 안내"
        withHandleBar={true}
        child={<Usage withSubscribe={true} />}
      />
    </div>
  );
};

export default Home;
