import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      id="snapkeep-toast-notification"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div
        className="px-4 py-2.5 rounded-full flex items-center gap-2 matte-tile"
        style={{
          color: '#F2F3F5',
          fontSize: '13px',
          lineHeight: '16px',
        }}
      >
        <span className="font-normal">{message}</span>
      </div>
    </div>
  );
};
