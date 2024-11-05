import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowIcon from './ArrowIcon';

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
      className="bg-white rounded-full p-3 hover:bg-gray-100 transition-colors"
    >
      <ArrowIcon direction="left" />
    </button>
  );
};

export default BackButton; 