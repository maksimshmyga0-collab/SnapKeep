import React from 'react';
import { SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';

interface ItemDetailSheetProps {
  item: SavedItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const ItemDetailSheet: React.FC<ItemDetailSheetProps> = ({
  item,
  onClose,
  onDelete,
}) => {
  if (!item) return null;

  const handleCopy = () => {
    triggerHaptic('success');
    const textToCopy = item.url || item.textContent || item.title;
    navigator.clipboard?.writeText(textToCopy);
  };

  const handleOpenLink = () => {
    if (item.url) {
      triggerHaptic('light');
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = () => {
    triggerHaptic('medium');
    onDelete(item.id);
    onClose();
  };

  return (
    <div
      id="item-detail-sheet-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
        className="w-full max-w-md bg-[#0B0C0E] flex flex-col animate-in fade-in slide-in-from-bottom duration-200"
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="text-[12px] px-2.5 py-1 rounded-lg font-normal"
              style={{
                backgroundColor: 'rgba(90, 109, 166, 0.22)',
                border: '1px solid rgba(140, 157, 214, 0.28)',
                color: '#E4E8F2',
              }}
            >
              {item.category}
            </span>
            <span className="text-[12px] text-[#6C717A]">
              · {item.sourceLabel}
            </span>
          </div>
          <button
            id="close-item-detail-sheet"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Закрыть"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
            className="p-3 rounded-xl mb-4 break-all text-[13px] text-[#8E939C] flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {item.textContent && (
          <div
            className="p-3.5 rounded-xl mb-4 text-[14px] text-[#C3C8D0] leading-relaxed whitespace-pre-wrap"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {item.textContent}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          {item.url && (
            <button
              type="button"
              onClick={handleOpenLink}
              className="flex-1 py-3 rounded-xl font-medium text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-opacity active:opacity-80"
              style={{
                backgroundColor: 'rgba(90, 109, 166, 0.25)',
                border: '1px solid rgba(140, 157, 214, 0.35)',
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
            className="flex-1 py-3 rounded-xl font-normal text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-opacity active:opacity-80"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
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
            className="w-12 py-3 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
