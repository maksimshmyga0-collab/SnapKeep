import React, { useState } from 'react';
import { CategoryName, SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';

interface CategoriesViewProps {
  categoryCounts: Record<CategoryName, number>;
  items: SavedItem[];
  selectedCategory: CategoryName | null;
  onSelectCategory: (cat: CategoryName | null) => void;
  onSelectItem: (item: SavedItem) => void;
}

const CATEGORIES: CategoryName[] = [
  'Учёба',
  'Идеи',
  'Дизайн',
  'Деньги',
  'Творчество',
  'Разное',
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categoryCounts,
  items,
  selectedCategory,
  onSelectCategory,
  onSelectItem,
}) => {
  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : [];

  return (
    <div
      id="screen-categories"
      className="flex-1 w-full flex flex-col px-5 pt-6 pb-2 overflow-hidden select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onSelectCategory(null);
              }}
              aria-label="Назад ко всем категориям"
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[#8E939C] hover:text-[#F2F3F5] mr-1"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h1
            className="text-[#F2F3F5] font-medium"
            style={{ fontSize: '20px', lineHeight: '24px', letterSpacing: '-0.01em' }}
          >
            {selectedCategory || 'Категории'}
          </h1>
        </div>

        {selectedCategory && (
          <span className="text-[#6C717A] text-[13px] font-normal">
            {filteredItems.length}
          </span>
        )}
      </div>

      {/* When NO category is selected: Grid / List of the 6 Categories */}
      {!selectedCategory ? (
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  onSelectCategory(cat);
                }}
                className="w-full rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors text-left active:opacity-85"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(90, 109, 166, 0.16)',
                      border: '1px solid rgba(140, 157, 214, 0.22)',
                      color: '#C8D2F0',
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[#F2F3F5] text-[15px] font-medium leading-tight">
                      {cat}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#6C717A] text-[13px] font-normal">
                    {count}
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5C6068"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* When a category is selected: Show the category's saved items */
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4 scrollbar-none">
          {/* Quick Category switcher pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = cat === selectedCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    onSelectCategory(cat);
                  }}
                  className="rounded-xl px-3 py-1 text-[12px] font-normal shrink-0 transition-colors"
                  style={{
                    backgroundColor: isActive ? 'rgba(90, 109, 166, 0.24)' : 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid rgba(140, 157, 214, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#E4E8F2' : '#8E939C',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center px-4">
              <span className="text-[#6C717A] text-[14px] font-normal mb-1">
                В этой категории пока пусто
              </span>
              <span className="text-[#5C6068] text-[12px]">
                Сохраните ссылку или заметку в категорию «{selectedCategory}»
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
                {/* 34px Icon */}
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

                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[#F2F3F5] text-[13.5px] font-normal leading-snug line-clamp-2 mb-0.5">
                    {item.title}
                  </div>
                  <div className="text-[#6C717A] text-[12px] font-normal leading-none">
                    {item.category} · {item.sourceLabel}
                  </div>
                </div>

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
      )}
    </div>
  );
};
