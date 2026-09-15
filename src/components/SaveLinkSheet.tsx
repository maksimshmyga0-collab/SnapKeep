import React, { useState } from 'react';
import { CategoryName, SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';

interface SaveLinkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  initialUrl?: string;
  initialTitle?: string;
  initialCategory?: CategoryName;
}

const CATEGORIES: CategoryName[] = [
  'Учёба',
  'Идеи',
  'Дизайн',
  'Деньги',
  'Творчество',
  'Разное',
];

export const SaveLinkSheet: React.FC<SaveLinkSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  initialUrl = 'https://youtube.com/watch?v=7h1zR_8V91m',
  initialTitle = 'Архитектура распределённых систем и микросервисов',
  initialCategory = 'Учёба',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>(initialCategory);
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: CategoryName) => {
    triggerHaptic('selection');
    setSelectedCategory(cat);
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    let source = 'ссылка';
    try {
      const parsed = new URL(url);
      source = parsed.hostname.replace(/^www\./, '');
    } catch {
      source = 'ссылка';
    }

    const isVideo = url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo');

    onSave({
      title: title.trim() || 'Сохранённая ссылка',
      url: url.trim(),
      sourceKind: isVideo ? 'video' : 'article',
      sourceLabel: source,
      category: selectedCategory,
    });
    onClose();
  };

  return (
    <div
      id="save-link-sheet-backdrop"
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
        id="save-link-sheet-panel"
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
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-[#F2F3F5] font-medium"
            style={{ fontSize: '16px', lineHeight: '20px' }}
          >
            Сохранить ссылку
          </h2>
          <button
            id="close-save-link-sheet"
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

        {/* Detected Link Preview Card */}
        <div
          className="rounded-2xl p-3.5 mb-5 flex items-start gap-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Source Icon Chip */}
          <div
            className="w-[34px] h-[34px] rounded-xl shrink-0 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(90, 109, 166, 0.22)',
              border: '1px solid rgba(140, 157, 214, 0.28)',
              color: '#C8D2F0',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название ссылки"
              className="w-full bg-transparent text-[#F2F3F5] font-medium text-[14px] leading-tight mb-1 truncate focus:outline-none"
            />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-transparent text-[#6C717A] text-[12px] leading-tight truncate focus:outline-none"
            />
          </div>
        </div>

        {/* Category Section */}
        <div className="mb-6">
          <div
            className="text-[#8E939C] mb-2.5 font-normal"
            style={{ fontSize: '12px', letterSpacing: '-0.01em' }}
          >
            Категория
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className="rounded-xl px-3.5 py-1.5 cursor-pointer text-[13px] font-normal transition-all"
                  style={{
                    backgroundColor: isSelected ? 'rgba(90, 109, 166, 0.24)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid rgba(140, 157, 214, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#E4E8F2' : '#8E939C',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Action Button */}
        <button
          id="confirm-save-link-button"
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 cursor-pointer font-medium text-[15px] transition-opacity active:opacity-80"
          style={{
            backgroundColor: 'rgba(90, 109, 166, 0.25)',
            border: '1px solid rgba(140, 157, 214, 0.35)',
            color: '#E4E8F2',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Готово</span>
        </button>
      </div>
    </div>
  );
};
