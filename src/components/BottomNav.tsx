import React from 'react';
import { MainTab } from '../types';
import { triggerHaptic } from '../services/telegram';

interface BottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const handleSelect = (tab: MainTab) => {
    if (tab !== activeTab) {
      triggerHaptic('light');
      onTabChange(tab);
    }
  };

  return (
    <nav
      id="bottom-navigation"
      aria-label="Основная навигация"
      className="w-full shrink-0 select-none z-30"
      style={{
        backgroundColor: '#0C0D10',
        borderTop: '1px solid rgba(255, 255, 255, 0.075)',
        paddingTop: '10px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div className="w-full flex items-center justify-around max-w-md mx-auto">
        {/* 1. HOME */}
        <button
          id="nav-tab-home"
          type="button"
          onClick={() => handleSelect('HOME')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl cursor-pointer transition-all ${
            activeTab === 'HOME' ? 'matte-chip' : ''
          }`}
          style={{
            color: activeTab === 'HOME' ? '#F2F3F5' : '#7C818A',
            backgroundColor: activeTab === 'HOME' ? undefined : 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '3px' }}
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'HOME' ? 500 : 400,
              lineHeight: '13px',
              letterSpacing: '-0.01em',
            }}
          >
            Главная
          </span>
        </button>

        {/* 2. SAVED */}
        <button
          id="nav-tab-saved"
          type="button"
          onClick={() => handleSelect('SAVED')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl cursor-pointer transition-all relative ${
            activeTab === 'SAVED' ? 'matte-chip' : ''
          }`}
          style={{
            color: activeTab === 'SAVED' ? '#F2F3F5' : '#7C818A',
            backgroundColor: activeTab === 'SAVED' ? undefined : 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '3px' }}
          >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'SAVED' ? 500 : 400,
              lineHeight: '13px',
              letterSpacing: '-0.01em',
            }}
          >
            Сохранённое
          </span>
        </button>

        {/* 3. CATEGORIES */}
        <button
          id="nav-tab-categories"
          type="button"
          onClick={() => handleSelect('CATEGORIES')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl cursor-pointer transition-all ${
            activeTab === 'CATEGORIES' ? 'matte-chip' : ''
          }`}
          style={{
            color: activeTab === 'CATEGORIES' ? '#F2F3F5' : '#7C818A',
            backgroundColor: activeTab === 'CATEGORIES' ? undefined : 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '3px' }}
          >
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
          <span
            style={{
              fontSize: '11px',
              fontWeight: activeTab === 'CATEGORIES' ? 500 : 400,
              lineHeight: '13px',
              letterSpacing: '-0.01em',
            }}
          >
            Категории
          </span>
        </button>
      </div>
    </nav>
  );
};
