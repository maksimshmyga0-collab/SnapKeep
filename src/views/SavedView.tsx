import React, { useRef, useEffect } from 'react';
import { SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';
import { ItemCard } from '../components/ItemCard';

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
      (item.previewTitle && item.previewTitle.toLowerCase().includes(q)) ||
      (item.previewDescription && item.previewDescription.toLowerCase().includes(q)) ||
      (item.previewDomain && item.previewDomain.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q) ||
      item.sourceLabel.toLowerCase().includes(q) ||
      (item.textContent && item.textContent.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q))
    );
  });

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

      {/* Search Field (Matte tile with soft white reflection) */}
      <div
        className={`w-full rounded-[18px] py-2.5 px-3.5 flex items-center gap-2.5 mb-4 shrink-0 transition-all matte-tile ${
          searchQuery.trim() ? 'border-[rgba(140,157,214,0.35)]' : ''
        }`}
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

      {/* List of Saved Items or Empty State */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 pb-3 scrollbar-none">
        {items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[#8E939C] text-[15px] font-normal mb-1">
              Пока ничего не сохранено
            </span>
            <span className="text-[#5C6068] text-[13px]">
              Сохрани первую ссылку или заметку
            </span>
          </div>
        ) : filteredItems.length === 0 ? (
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
            <ItemCard
              key={item.id}
              item={item}
              searchQuery={searchQuery}
              onOpenDetails={onSelectItem}
            />
          ))
        )}
      </div>
    </div>
  );
};
