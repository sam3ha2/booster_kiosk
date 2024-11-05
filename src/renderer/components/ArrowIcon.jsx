import React from 'react';

const ArrowIcon = ({ direction = 'right', color = 'text-black', size = 'w-6 h-6'}) => {
  const d = direction === 'right' ? 'M14 5l7 7-7 7 M3 12H20' :'M10 19l-7-7 7-7 M21 12H4';
  return (
    <svg 
      className={`${size} ${color}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d={d}
      />
    </svg>
  );
};

export default ArrowIcon; 