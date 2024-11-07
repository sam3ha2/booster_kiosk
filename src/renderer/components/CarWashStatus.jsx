import React from 'react';

const CarWashStatus = ({ carWashState, isDevelopment }) => {
  if (!carWashState && !isDevelopment) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl text-white mb-4">
      <h3 className="text-lg font-semibold mb-2">세차기 상태</h3>
      {carWashState && (
        <>
          <p>현재 단계: {carWashState.currentStep || '없음'}</p>
          {carWashState.remainingTime !== undefined && (
            <>
              <p>남은 시간: {Math.floor(carWashState.remainingTime / 60)}분 {carWashState.remainingTime % 60}초</p>
              <p>진행률: {carWashState.progress}%</p>
            </>
          )}
          <p>오류 상태: {carWashState.error ? '오류' : '정상'}</p>
        </>
      )}
    </div>
  );
};

export default CarWashStatus;
