import React from 'react';
import BackButton from './BackButton';

const AppBar = ({ label, image, showBack = false, onBack }) => {
  return (
    <div className="border-gray-800">
      <div className="max-w-md mx-auto relative p-4 flex items-center justify-center min-h-[64px]">
        {showBack && (
          <div className="absolute left-4">
            <BackButton onClick={onBack} />
          </div>
        )}
        
        {label && (
          <h2 className="text-white text-2xl font-bold">
            {label}
          </h2>
        )}
        
        {image && (
          <img 
            src={image} 
            alt="Header Image"
            className="h-5 object-contain" 
          />
        )}
      </div>
    </div>
  );
};

export default AppBar; 