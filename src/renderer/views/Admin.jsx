import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/AppBar';

const Admin = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [carWashState, setCarWashState] = useState(null);
  const [deviceStates, setDeviceStates] = useState({
    carWash: { connected: false, path: '' },
    scanner: { connected: false },
    printer: { connected: false }
  });

  const handlePinInput = (digit) => {
    if (pinCode.length < 4) {
      setPinCode(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinCode('');
  };

  const handleLogin = () => {
    if (pinCode === '3124') {
      setIsLoggedIn(true);
    } else {
      alert('비밀번호가 잘못되었습니다.');
      setPinCode('');
    }
  };

  useEffect(() => {
    if (pinCode.length === 4) {
      handleLogin();
    }
  }, [pinCode]);

  useEffect(() => {
    const statusUpdateListener = (data) => {
      console.log('세차기 상태 업데이트:', data);
      setCarWashState(data);
    };

    if (isLoggedIn) {
      window.machineIPC.onStatusUpdate(statusUpdateListener);
    }

    return () => {
      if (isLoggedIn) {
        window.machineIPC.offStatusUpdate(statusUpdateListener);
      }
    };
  }, [isLoggedIn]);

  const handleDeviceConnection = async (deviceType, action) => {
    // 실제 연결/해제 로직 구현 필요
    console.log(`${deviceType} ${action} 요청`);
  };

  const MenuItem = ({ label, value, onClick, showArrow, actionButton }) => (
    <div className="flex items-center justify-between py-4 px-6 border-b border-gray-700 hover:bg-gray-800 cursor-pointer">
      <span className="text-white text-lg">{label}</span>
      <div className="flex items-center">
        {value && <span className="text-gray-400 mr-4">{value}</span>}
        {actionButton}
        {showArrow && (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  const AdminMenu = () => (
    <div className="w-full max-w-2xl bg-gray-900 rounded-lg overflow-hidden">
      <MenuItem 
        label="결제 관리" 
        onClick={() => navigate('/payment-admin')} 
        showArrow={true}
      />
      
      <MenuItem 
        label="세차기 관리" 
        value={deviceStates.carWash.connected ? deviceStates.carWash.path : '연결 안됨'}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('carWash', deviceStates.carWash.connected ? '해제' : '연결')}
            className={`px-3 py-1 rounded mr-4 ${deviceStates.carWash.connected ? 'bg-red-600' : 'bg-green-600'}`}
          >
            {deviceStates.carWash.connected ? '해제' : '연결'}
          </button>
        }
      />

      <MenuItem 
        label="세차기 상태" 
        value={carWashState?.state || '상태 확인 중...'}
      />

      <MenuItem 
        label="스캐너 관리" 
        value={deviceStates.scanner.connected ? '연결됨' : '연결 안됨'}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('scanner', deviceStates.scanner.connected ? '해제' : '연결')}
            className={`px-3 py-1 rounded mr-4 ${deviceStates.scanner.connected ? 'bg-red-600' : 'bg-green-600'}`}
          >
            {deviceStates.scanner.connected ? '해제' : '연결'}
          </button>
        }
      />

      <MenuItem 
        label="프린터 관리" 
        value={deviceStates.printer.connected ? '연결됨' : '연결 안됨'}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('printer', deviceStates.printer.connected ? '해제' : '연결')}
            className={`px-3 py-1 rounded mr-4 ${deviceStates.printer.connected ? 'bg-red-600' : 'bg-green-600'}`}
          >
            {deviceStates.printer.connected ? '해제' : '연결'}
          </button>
        }
      />

      <MenuItem 
        label="버전 정보" 
        value={`v${APP_VERSION}`}
      />
    </div>
  );

  const Keypad = () => {
    const keys = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['clear', 0, 'back']
    ];

    return (
      <div className="w-full max-w-xs">
        {/* PIN 표시 영역 */}
        <div className="mb-8 text-center">
          <div className="text-2xl text-white mb-4">관리자 로그인</div>
          <div className="flex justify-center space-x-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{
                  backgroundColor: i < pinCode.length ? 'white' : 'transparent'
                }}
              />
            ))}
          </div>
        </div>

        {/* 키패드 */}
        <div className="grid grid-cols-3 gap-4">
          {keys.map((row, rowIndex) => 
            row.map((key, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => {
                  if (key === 'clear') handleClear();
                  else if (key === 'back') handleBackspace();
                  else handlePinInput(key);
                }}
                className={`
                  h-16 rounded-lg text-2xl font-bold
                  ${typeof key === 'number' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                  transition-colors duration-200
                  flex items-center justify-center
                `}
              >
                {key === 'back' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : key === 'clear' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : key}
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <AppBar 
        label="관리자 페이지"
        showBack={true}
      />

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        {!isLoggedIn ? (
          <Keypad />
        ) : (
          <AdminMenu />
        )}
      </div>
    </div>
  );
};

export default Admin;
