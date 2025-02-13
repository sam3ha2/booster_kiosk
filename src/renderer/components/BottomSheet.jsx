import { useState, useEffect } from "react";

export const BottomSheet = ({ isShow, toggle, title, child, withHandleBar, isModal }) => {
  const [lastY, setLastY] = useState(0); // 마지막 Y 좌표
  const [directionUp, setDirectionUp] = useState(false); // 마지막 이동 방향이 위인지
  const [draggedY, setDraggedY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // 닫힘 상태 추적

  useEffect(() => {
    if (isShow) {
      setDraggedY(0); // 다시 열릴 때 Y 위치 초기화
      setIsClosing(false);
    } else {
      setDraggedY(window.innerHeight);
    }
  }, [isShow]);

  const handleTouchStart = (e) => {
    if (isModal) return;
    setLastY(e.touches[0].clientY); // 마지막 Y 좌표 초기화
    setDraggedY(0);
    setIsDragging(true);
    setIsClosing(false);
  };

  const handleTouchMove = (e) => {
    if (isModal) return;
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - lastY;

    if (deltaY !== 0) {
      setDraggedY((prev) => Math.max(0, prev + deltaY * 0.9)); // 이동 감도 조절 (더 부드럽게)
      setLastY(currentY); // 현재 터치 위치를 마지막 위치로 업데이트
      setDirectionUp(currentY < lastY); // 이동 방향 감지
    }
  };

  const handleTouchEnd = () => {
    if (isModal) return;
    setIsDragging(false);

    // 마지막 이동 방향이 위쪽(살짝이라도 올리면) → 복귀
    if (directionUp) {
      setDraggedY(0);
    }
    // 아래로 많이 내렸으면 닫기
    else if (draggedY > 120) {
      closeSheet();
    }
    // 살짝 이동한 경우 원위치
    else {
      setDraggedY(0);
    }
  };

  const closeSheet = () => {
    setIsClosing(true);
    setDraggedY(window.innerHeight); // 부드럽게 아래로 내려가게 설정
    setTimeout(() => {
      toggle();
    }, 300); // 애니메이션 후 toggle 실행
  };

  return (
    <div
      className={`fixed inset-0 bg-black/80 z-50 transition-opacity duration-300 ${
        isShow && !isClosing ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={isModal ? null : closeSheet} // 배경 클릭 시 닫힘
    >
      <div
        className="fixed bottom-0 w-full bg-[#3e3e3e] p-8 rounded-t-[64px] text-white transition-transform duration-300 transform"
        style={{
          transform: `translateY(${isClosing ? window.innerHeight : draggedY}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫히지 않음
        onTouchStart={handleTouchStart} // 드래그 시작
        onTouchMove={handleTouchMove} // 드래그 중
        onTouchEnd={handleTouchEnd} // 드래그 종료
      >
        {isModal ? null : withHandleBar ? (
          <div className="w-16 h-2 bg-gray-400 rounded-full mx-auto mb-4 cursor-pointer" />
        ) : (
          <button onClick={closeSheet} className="absolute top-8 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M26.2426 23.4142L46.8284 2.82843L44 0L23.4142 20.5858L2.82843 6.29585e-05L0 2.82849L20.5858 23.4142L0 44L2.82843 46.8284L23.4142 26.2427L44 46.8285L46.8284 44.0001L26.2426 23.4142Z" fill="black" />
            </svg>
          </button>
        )}

        <h2 className="text-5xl font-bold mb-6 text-center">{title}</h2>
        {child}
      </div>
    </div>
  );
};
