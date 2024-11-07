import React from 'react';
import BackButton from './BackButton';

const AppBar = ({ label, image, showBack = false, onBack }) => {
  return (
    <div className="w-full">
      <div className="flex items-center p-4 justify-center min-h-[64px]">
        {showBack && (
          <div className="absolute start-4">
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
            className="h-4 object-contain" 
          />
        )}
      </div>
    </div>
  );
};

export default AppBar; 