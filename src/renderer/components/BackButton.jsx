import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
    >
      <svg 
        className="w-6 h-6 text-black" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
    </button>
  );
};

export default BackButton; 