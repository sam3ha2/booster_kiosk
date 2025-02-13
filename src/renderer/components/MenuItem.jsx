import React from "react";

export const MenuItem = ({ label, value, onClick, showArrow, actionButton, extraButton , status }) => (
  <div
    className="flex items-center justify-between py-4 px-6 border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
    onClick={onClick}
  >
    <span className="text-white text-lg">{label}</span>
    <div className="flex items-center">
      {status && (
        <span className={`mr-4 text-sm ${status === 'error' ? 'text-red-500' :
            status === 'ready' ? 'text-green-500' : 'text-gray-400'}`}>
          {status}
        </span>
      )}
      {value && <span className="text-gray-400 text-base mr-2">{value}</span>}
      {actionButton}
      {extraButton}
      {showArrow && (
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  </div>
);
