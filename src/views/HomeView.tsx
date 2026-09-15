import React from 'react';
import { CategoryName } from '../types';
import { triggerHaptic } from '../services/telegram';

interface HomeViewProps {
  totalSaved: number;
  todayCount: number;
  categoryCounts: Record<CategoryName, number>;
  onOpenSearch: () => void;
  onSelectCategory: (category: CategoryName) => void;
  onOpenSaveLink: () => void;
  onOpenSaveNote: () => void;
}

const CATEGORIES: CategoryName[] = [
  'Учёба',
  'Идеи',
  'Дизайн',
  'Деньги',
  'Творчество',
  'Разное',
];

export const HomeView: React.FC<HomeViewProps> = ({
  totalSaved,
  todayCount,
  categoryCounts,
  onOpenSearch,
  onSelectCategory,
  onOpenSaveLink,
  onOpenSaveNote,
}) => {
  return (
    <div
      id="screen-home"
      className="flex-1 w-full flex flex-col justify-between px-5 pt-7 pb-4 select-none overflow-hidden"
    >
      {/* Top Block: Brand & Statistics */}
      <div>
        <div className="mb-2">
          <span
            className="text-[#6C717A] tracking-normal font-normal"
            style={{ fontSize: '13px', lineHeight: '16px' }}
          >
            SnapKeep
          </span>
        </div>

        <div className="flex flex-col">
          <div
            className="text-[#F2F3F5] font-medium tracking-tight"
            style={{ fontSize: '30px', lineHeight: '36px', letterSpacing: '-0.02em' }}
          >
            {totalSaved} сохранено
          </div>
          <div
            className="text-[#7C818A] font-normal mt-1"
            style={{ fontSize: '14px', lineHeight: '18px' }}
          >
            {todayCount} за сегодня
          </div>
        </div>
      </div>

      {/* Middle Block: Search & Categories */}
      <div className="my-auto py-4 flex flex-col gap-6">
        {/* Full-width Search Trigger Button */}
        <button
          id="home-search-trigger"
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenSearch();
          }}
          className="w-full rounded-[18px] py-3.5 px-4 flex items-center gap-3 cursor-pointer text-left transition-colors"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8E939C"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span
            className="text-[#7C818A] font-normal"
            style={{ fontSize: '14px', lineHeight: '18px' }}
          >
            Найти сохранённое
          </span>
        </button>

        {/* Compact Category Chips */}
        <div>
          <div className="flex flex-wrap gap-[7px]">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  id={`home-chip-${cat}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    onSelectCategory(cat);
                  }}
                  className="rounded-[20px] px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                  }}
                >
                  <span
                    className="text-[#C3C8D0] font-normal"
                    style={{ fontSize: '13px', lineHeight: '16px' }}
                  >
                    {cat}
                  </span>
                  <span
                    className="text-[#6C717A] font-normal"
                    style={{ fontSize: '12px', lineHeight: '16px' }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Block: Main Save Action & Secondary Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        {/* Main Save Action (Most important action on screen) */}
        <button
          id="main-save-action-button"
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onOpenSaveLink();
          }}
          className="w-full rounded-[18px] py-4 flex items-center justify-center gap-2 cursor-pointer font-medium transition-opacity active:opacity-85 shadow-sm"
          style={{
            backgroundColor: 'rgba(90, 109, 166, 0.22)',
            border: '1px solid rgba(140, 157, 214, 0.28)',
            color: '#E4E8F2',
            fontSize: '15px',
            lineHeight: '20px',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Сохранить</span>
        </button>

        {/* Two smaller actions: Ссылка & Заметка */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="quick-save-link-button"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSaveLink();
            }}
            className="rounded-[16px] py-3 px-4 flex items-center justify-center gap-2 cursor-pointer font-normal transition-colors active:opacity-80"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#C3C8D0',
              fontSize: '13.5px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8E939C"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Ссылка</span>
          </button>

          <button
            id="quick-save-note-button"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSaveNote();
            }}
            className="rounded-[16px] py-3 px-4 flex items-center justify-center gap-2 cursor-pointer font-normal transition-colors active:opacity-80"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#C3C8D0',
              fontSize: '13.5px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8E939C"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Заметка</span>
          </button>
        </div>

        {/* Centered Hint */}
        <div className="text-center pt-1 pb-1">
          <span
            className="text-[#5C6068] font-normal"
            style={{ fontSize: '11.5px', lineHeight: '14px' }}
          >
            Из буфера обмена: youtube.com/watch…
          </span>
        </div>
      </div>
    </div>
  );
};
