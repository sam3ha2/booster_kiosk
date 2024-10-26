import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigate 훅 임포트
import CarWashStatus from '../components/CarWashStatus'; // CarWashStatus 컴포넌트 임포트

const Admin = () => {
  const navigate = useNavigate(); // navigate 함수 생성
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 상태 관리
  const [username, setUsername] = useState('admin'); // 사용자 이름 상태
  const [password, setPassword] = useState(''); // 비밀번호 상태
  const [carWashState, setCarWashState] = useState(null); // 세차기 상태 관리

  const handleLogin = (e) => {
    e.preventDefault();
    // 로그인 로직 (예: 아이디와 비밀번호 확인)
    if (username === 'admin' && password === '1234') { // 예시: admin/1234
      setIsLoggedIn(true);
    } else {
      alert('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

  useEffect(() => {
    const statusUpdateListener = (data) => {
      console.log('세차기 상태 업데이트:', data);
      setCarWashState(data); // 세차기 상태 업데이트
    };

    if (isLoggedIn) {
      window.machineIPC.onStatusUpdate(statusUpdateListener); // 상태 구독
    }

    return () => {
      if (isLoggedIn) {
        window.machineIPC.offStatusUpdate(statusUpdateListener); // 상태 구독 해제
      }
    };
  }, [isLoggedIn]);

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white rounded-full p-2">
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {!isLoggedIn ? (
        <form onSubmit={handleLogin} className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-4">로그인</h1>
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
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">로그인</button>
        </form>
      ) : (
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-4">관리자 페이지</h1>
          <p>여기에서 관리 작업을 수행할 수 있습니다.</p>
          {/* CarWashStatus 컴포넌트를 사용하여 세차기 상태 표시 */}
          <CarWashStatus carWashState={carWashState} isDevelopment={false} />
        </div>
      )}
    </div>
  );
};

export default Admin;
