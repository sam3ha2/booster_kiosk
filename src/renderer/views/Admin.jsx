import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CarWashStatus from '../components/CarWashStatus';
import AppBar from '../components/AppBar';

const Admin = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [carWashState, setCarWashState] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      setIsLoggedIn(true);
    } else {
      alert('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

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

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <AppBar 
        label="관리자 페이지"
        showBack={true}
      />

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col items-center">
            <input 
              type="text" 
              placeholder="아이디" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="mb-2 p-2 border border-gray-300 rounded"
            />
            <input 
              type="password" 
              placeholder="비밀번호" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mb-4 p-2 border border-gray-300 rounded"
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              로그인
            </button>
          </form>
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
