import React, { useRef, useEffect } from 'react';
import { SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';

interface SavedViewProps {
  items: SavedItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectItem: (item: SavedItem) => void;
  autoFocusSearch?: boolean;
}

export const SavedView: React.FC<SavedViewProps> = ({
  items,
  searchQuery,
  onSearchChange,
  onSelectItem,
  autoFocusSearch = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusSearch]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.sourceLabel.toLowerCase().includes(q) ||
      (item.textContent && item.textContent.toLowerCase().includes(q))
    );
  });

  // Highlight matching search text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} style={{ color: '#8FA3DE', fontWeight: 500 }}>
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div
      id="screen-saved"
      className="flex-1 w-full flex flex-col px-5 pt-6 pb-2 overflow-hidden select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-[#F2F3F5] font-medium"
          style={{ fontSize: '20px', lineHeight: '24px', letterSpacing: '-0.01em' }}
        >
          Сохранённое
        </h1>
        <span
          className="text-[#6C717A] text-[13px] font-normal"
        >
          {filteredItems.length}
        </span>
      </div>

      {/* Search Field */}
      <div
        className="w-full rounded-[18px] py-2.5 px-3.5 flex items-center gap-2.5 mb-4 shrink-0 transition-colors"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: searchQuery.trim()
            ? '1px solid rgba(140, 157, 214, 0.35)'
            : '1px solid rgba(255, 255, 255, 0.09)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={searchQuery.trim() ? '#8FA3DE' : '#8E939C'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          id="saved-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Найти сохранённое"
          className="flex-1 bg-transparent text-[#F2F3F5] text-[14px] placeholder:text-[#7C818A] focus:outline-none"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSearchChange('');
            }}
            aria-label="Очистить поиск"
            className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer text-[#8E939C] hover:text-[#F2F3F5]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* List of Saved Items */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 pb-3 scrollbar-none">
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[#6C717A] text-[14px] font-normal mb-1">
              Ничего не найдено
            </span>
            <span className="text-[#5C6068] text-[12px]">
              Попробуйте другой запрос
            </span>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                onSelectItem(item);
              }}
              className="rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-colors active:opacity-85"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Small Type Icon (34px) */}
              <div
                className="w-[34px] h-[34px] rounded-xl shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(90, 109, 166, 0.22)',
                  border: '1px solid rgba(140, 157, 214, 0.28)',
                  color: '#C8D2F0',
                }}
              >
                {item.sourceKind === 'video' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : item.sourceKind === 'note' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0 pr-1">
                <div
                  className="text-[#F2F3F5] text-[13.5px] font-normal leading-snug line-clamp-2 mb-0.5"
                >
                  {renderHighlightedText(item.title, searchQuery)}
                </div>
                <div
                  className="text-[#6C717A] text-[12px] font-normal leading-none"
                >
                  {item.category} · {item.sourceLabel}
                </div>
              </div>

              {/* Subtle chevron */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5C6068"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 ml-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
