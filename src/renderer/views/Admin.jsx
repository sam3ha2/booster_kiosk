import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CarWashStatus from '../components/CarWashStatus';
import AppBar from '../components/AppBar';

const Admin = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [carWashState, setCarWashState] = useState(null);

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

  const AdminMenu = () => (
    <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
      <button
        onClick={() => navigate('/payment-admin')}
        className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center transition-colors"
      >
        <svg 
          className="w-8 h-8 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
          />
        </svg>
        <span className="text-lg font-semibold">결제 관리</span>
        <span className="text-sm mt-1">결제 내역 조회 및 취소</span>
      </button>

      <button
        onClick={() => {}} // 다른 관리 메뉴를 위한 공간
        className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center transition-colors"
      >
        <svg 
          className="w-8 h-8 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
        <span className="text-lg font-semibold">설정</span>
        <span className="text-sm mt-1">시스템 설정 관리</span>
      </button>
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
          <div className="flex flex-col items-center w-full">
            <CarWashStatus carWashState={carWashState} isDevelopment={false} />
            <AdminMenu />
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
