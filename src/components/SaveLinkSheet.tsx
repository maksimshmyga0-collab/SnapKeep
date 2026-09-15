import React, { useState, useEffect } from 'react';
import { CategoryName, SavedItem } from '../types';
import { CATEGORIES } from '../data/initialData';
import { triggerHaptic } from '../services/telegram';

interface SaveLinkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  initialCategory?: CategoryName;
}

export const SaveLinkSheet: React.FC<SaveLinkSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory = 'Учёба',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>(initialCategory);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  // Reset fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setUrl('');
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: CategoryName) => {
    triggerHaptic('selection');
    setSelectedCategory(cat);
  };

  const handleConfirm = () => {
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();

    if (!trimmedUrl && !trimmedTitle) {
      triggerHaptic('medium');
      return;
    }

    triggerHaptic('success');
    let source = 'ссылка';
    let formattedUrl = trimmedUrl;

    if (trimmedUrl) {
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        formattedUrl = `https://${trimmedUrl}`;
      }
      try {
        const parsed = new URL(formattedUrl);
        source = parsed.hostname.replace(/^www\./, '');
      } catch {
        source = 'ссылка';
      }
    }

    const isVideo =
      formattedUrl.includes('youtube') ||
      formattedUrl.includes('youtu.be') ||
      formattedUrl.includes('vimeo') ||
      formattedUrl.includes('tiktok');

    onSave({
      title: trimmedTitle || source || 'Сохранённая ссылка',
      url: formattedUrl || undefined,
      sourceKind: isVideo ? 'video' : 'article',
      sourceLabel: source,
      category: selectedCategory,
    });
    onClose();
  };

  const isFormValid = url.trim().length > 0 || title.trim().length > 0;

  return (
    <div
      id="save-link-sheet-backdrop"
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
        id="save-link-sheet-panel"
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

        {/* Input: URL */}
        <div className="mb-3.5">
          <label className="block text-[12px] font-normal text-[#8E939C] mb-1.5">
            Ссылка или адрес
          </label>
          <input
            id="link-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            autoFocus
            className="w-full rounded-2xl py-3 px-3.5 text-[#F2F3F5] text-[14px] focus:outline-none transition-all placeholder:text-[#5C6068] matte-tile"
          />
        </div>

        {/* Input: Title (Optional) */}
        <div className="mb-4">
          <label className="block text-[12px] font-normal text-[#8E939C] mb-1.5">
            Название (необязательно)
          </label>
          <input
            id="link-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Краткое описание"
            className="w-full rounded-2xl py-3 px-3.5 text-[#F2F3F5] text-[14px] focus:outline-none transition-all placeholder:text-[#5C6068] matte-tile"
          />
        </div>

        {/* Category Selector */}
        <div className="mb-6">
          <label className="block text-[12px] font-normal text-[#8E939C] mb-2">
            Категория
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = cat === selectedCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-[12.5px] cursor-pointer transition-all ${
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

        {/* Confirm Action Button */}
        <button
          id="confirm-save-link-button"
          type="button"
          onClick={handleConfirm}
          disabled={!isFormValid}
          className={`w-full h-[52px] rounded-[18px] flex items-center justify-center font-medium transition-all ${
            isFormValid ? 'cursor-pointer active:opacity-85 matte-tile-primary' : 'cursor-not-allowed opacity-40 matte-tile'
          }`}
          style={{
            fontSize: '15px',
            color: isFormValid ? '#F2F3F5' : '#7C818A',
          }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
};
