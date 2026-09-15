import React, { useState, useEffect } from 'react';
import { CategoryName, SavedItem } from '../types';
import { CATEGORIES } from '../data/initialData';
import { triggerHaptic } from '../services/telegram';
import { BottomSheet } from './BottomSheet';

interface SaveNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  initialCategory?: CategoryName;
}

export const SaveNoteSheet: React.FC<SaveNoteSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory = 'Идеи',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>(initialCategory);
  const [noteContent, setNoteContent] = useState('');

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setNoteContent('');
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: CategoryName) => {
    triggerHaptic('selection');
    setSelectedCategory(cat);
  };

  const handleConfirm = () => {
    const trimmed = noteContent.trim();
    if (!trimmed) {
      triggerHaptic('medium');
      return;
    }

    triggerHaptic('success');
    // First line becomes the title, full text saved in textContent
    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    const title = lines[0] ? lines[0].slice(0, 60) : 'Заметка';

    onSave({
      title,
      textContent: trimmed,
      sourceKind: 'note',
      sourceLabel: 'заметка',
      category: selectedCategory,
    });
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="save-note-sheet-backdrop"
      panelId="save-note-sheet-panel"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[#F2F3F5] font-medium"
          style={{ fontSize: '16px', lineHeight: '20px' }}
        >
          Новая заметка
        </h2>
        <button
          id="close-save-note-sheet"
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

        {/* Note Text Area (Matte tile styling) */}
        <div className="mb-4">
          <textarea
            id="note-input-textarea"
            rows={4}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Запишите мысль или тезис..."
            autoFocus
            className="w-full rounded-2xl p-3.5 text-[#F2F3F5] text-[14px] leading-relaxed resize-none focus:outline-none transition-all placeholder:text-[#5C6068] matte-tile"
            style={{
              minHeight: '120px',
            }}
          />
        </div>

        {/* Category Section */}
        <div className="mb-5">
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
                  className={`rounded-xl px-3.5 py-1.5 cursor-pointer text-[13px] transition-all ${
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
          id="confirm-save-note-button"
          type="button"
          onClick={handleConfirm}
          disabled={!noteContent.trim()}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 cursor-pointer font-medium text-[15px] transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed matte-tile-primary"
          style={{
            color: '#E4E8F2',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Готово</span>
        </button>
    </BottomSheet>
  );
};
