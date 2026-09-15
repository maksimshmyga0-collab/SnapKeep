import React from 'react';
import { CategoryName, SavedItem } from '../types';
import { CATEGORIES } from '../data/initialData';
import { triggerHaptic } from '../services/telegram';

interface ItemDetailSheetProps {
  item: SavedItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateCategory?: (id: string, newCategory: CategoryName) => void;
}

export const ItemDetailSheet: React.FC<ItemDetailSheetProps> = ({
  item,
  onClose,
  onDelete,
  onUpdateCategory,
}) => {
  if (!item) return null;

  const handleOpenLink = () => {
    if (item.url) {
      triggerHaptic('light');
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = async () => {
    const textToCopy = item.url || item.textContent || item.title;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        triggerHaptic('success');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        triggerHaptic('success');
      }
    } catch {
      triggerHaptic('medium');
    }
  };

  const handleDelete = () => {
    triggerHaptic('medium');
    onDelete(item.id);
    onClose();
  };

  const handleCategoryChange = (newCat: CategoryName) => {
    if (onUpdateCategory && newCat !== item.category) {
      triggerHaptic('selection');
      onUpdateCategory(item.id, newCat);
    }
  };

  return (
    <div
      id="item-detail-sheet-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic('light');
          onClose();
        }
      }}
    >
      <div
        id="item-detail-sheet-panel"
        className="w-full max-w-md flex flex-col animate-in fade-in slide-in-from-bottom duration-200 matte-sheet-panel"
        style={{
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          paddingTop: '12px',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center mb-3">
          <div
            className="rounded-full"
            style={{
              width: '36px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
            }}
          />
        </div>

        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-[#6C717A] font-normal">
            Источник: {item.sourceLabel}
          </span>
          <button
            id="close-item-detail-sheet"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors matte-tile"
            style={{
              color: '#8E939C',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-[16px] text-[#F2F3F5] font-medium leading-snug mb-3">
          {item.title}
        </h3>

        {/* URL or Text Content */}
        {item.url && (
          <div
            className="p-3 rounded-xl mb-3 break-all text-[13px] text-[#8E939C] flex items-center justify-between gap-2 matte-tile"
          >
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {item.textContent && (
          <div
            className="p-3.5 rounded-xl mb-3 text-[14px] text-[#C3C8D0] leading-relaxed whitespace-pre-wrap matte-tile"
          >
            {item.textContent}
          </div>
        )}

        {/* Category Selection */}
        <div className="mb-4">
          <div className="text-[12px] text-[#8E939C] mb-2 font-normal">
            Категория
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = item.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] transition-all cursor-pointer ${
                    isSelected ? 'matte-tile-primary font-medium' : 'matte-chip font-normal'
                  }`}
                  style={{
                    color: isSelected ? '#E4E8F2' : '#8E939C',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          {item.url && (
            <button
              type="button"
              onClick={handleOpenLink}
              className="flex-1 py-3 rounded-xl font-medium text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-opacity active:opacity-80 matte-tile-primary"
              style={{
                color: '#E4E8F2',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Открыть</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-3 rounded-xl font-normal text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-opacity active:opacity-80 matte-tile"
            style={{
              color: '#C3C8D0',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <span>Копировать</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            aria-label="Удалить"
            className="w-12 py-3 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 matte-tile"
            style={{
              color: '#8E939C',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
