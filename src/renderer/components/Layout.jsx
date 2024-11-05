import React from 'react';
import videoSource from '../../assets/videos/booster_kiosk_mov_01.mp4';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-none h-1/3 bg-black text-white flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full">
          <video
            src={videoSource}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          ></video>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;