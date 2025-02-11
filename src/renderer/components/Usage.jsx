import React from 'react';
import infoSubscribe from '../../assets/images/info_subscribe.png';

const HighlightMessage = ({ message, accentKeywords }) => {
  const keywords = accentKeywords || [];
  const highlightedMessage = message.split(' ').map((word, index) => {
    const isAccent = keywords.includes(word);
    return (
      <span key={index} className={`text-white text-[34px] ${isAccent ? 'font-bold' : 'font-medium'}`}>
        {word}
        {index < message.split(' ').length - 1 && ' '}
      </span>
    );
  });

  return <div className="mt-2">{highlightedMessage}</div>;
};

const Element = ({ number, label, message, accentKeywords })=>(
  <div className="flex items-start space-x-2">
    <div className="w-[50px] h-[50px] min-w-[50px] rounded-full border-2 border-[#57f3a8] flex items-center justify-center">
      <div className="text-[#57f3a8] text-[34px] font-bold font-['SF Pro Display'] leading-10 text-center">
        {number}
      </div>
    </div>
    <div className="flex flex-col items-start">
      <div
        className={`h-[50px] px-4 rounded-full flex items-center justify-center`}
        style={{ backgroundColor: '#57f3a8' }}
      >
        <div className="text-black text-lg">{label}</div>
      </div>
      <HighlightMessage message={message} accentKeywords={accentKeywords} />
    </div>
  </div>
);

export const Usage = ({ onClickClose, withSubscribe }) => (
  <div>
    <button
      onClick={onClickClose}
      className="absolute top-8 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 47 47"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M26.2426 23.4142L46.8284 2.82843L44 0L23.4142 20.5858L2.82843 6.29585e-05L0 2.82849L20.5858 23.4142L0 44L2.82843 46.8284L23.4142 26.2427L44 46.8285L46.8284 44.0001L26.2426 23.4142Z"
          fill="black"
        />
      </svg>
    </button>

    <h2 className="text-5xl font-bold mb-6 text-center">부스터 키오스크 사용 안내</h2>

    <div className="space-y-8">
      <Element number="1" label="버튼 선택" message="앱 예약, 구독은 '자동세차 QR확인' 버튼으로 현장에서 결제할 경우 '자동세차 현장결제' 버튼을 눌러주세요." accentKeywords={['\'자동세차', 'QR확인\'', '현장결제\'']} />
      <Element number="2" label="QR 확인버튼 선택 시" message="QR확인은 모니터 왼쪽 하단에 30cm 거리 안에서 스캔하고 세차를 진행해 주세요." />
      <Element number="3" label="현장 결제버튼 선택 시" message="현장 결제는 원하는 상품을 누르고 전화번호 입력 후 모니터 오른쪽 하단 카드결제하고 세차를 진행해 주세요." />
    </div>
    {/* 하단 요금제 정보 */}
    {withSubscribe && (
      <img src={infoSubscribe} alt="구독요금제 안내" className="mt-10 rounded-[48px]" />
    )}
  </div>
);
