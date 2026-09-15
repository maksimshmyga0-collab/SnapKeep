import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CategoryName, SavedItem } from '../types';
import { CATEGORIES } from '../data/initialData';
import { triggerHaptic } from '../services/telegram';
import { readClipboardUrlSafely, formatShortUrl, normalizeUrl } from '../services/clipboard';

interface HomeViewProps {
  totalSaved: number;
  todayCount: number;
  categoryCounts: Record<CategoryName, number>;
  savedItems: SavedItem[];
  onOpenSearch: () => void;
  onSelectCategory: (category: CategoryName) => void;
  onOpenSaveLink: () => void;
  onOpenSaveNote: () => void;
  onSaveClipboardLink: (url: string) => void;
  onShowToast: (message: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  totalSaved,
  todayCount,
  categoryCounts,
  savedItems,
  onOpenSearch,
  onSelectCategory,
  onOpenSaveLink,
  onOpenSaveNote,
  onSaveClipboardLink,
  onShowToast,
}) => {
  // Detected clipboard link state
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);
  const lastSavedUrlRef = useRef<string | null>(null);

  // Check clipboard safely without throwing errors or showing alerts
  const checkClipboard = useCallback(async () => {
    try {
      const validUrl = await readClipboardUrlSafely();
      // If user just saved this exact URL in this session, don't re-show the hint
      if (validUrl && validUrl === lastSavedUrlRef.current) {
        return;
      }
      setDetectedClipboardUrl(validUrl);
    } catch {
      // Handled silently
    }
  }, []);

  // Check clipboard:
  // 1. When Home is opened/mounted
  // 2. When returning to window/tab (focus, visibilitychange)
  // 3. On initial touch/pointerdown (user interaction unlocks browser clipboard permissions)
  useEffect(() => {
    checkClipboard();

    // Secondary checks in case browser document focus was established shortly after mount
    const timer1 = setTimeout(checkClipboard, 350);
    const timer2 = setTimeout(checkClipboard, 900);

    const handleFocus = () => {
      checkClipboard();
      setTimeout(checkClipboard, 150);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkClipboard();
        setTimeout(checkClipboard, 150);
      }
    };

    const handlePointerDown = () => {
      checkClipboard();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [checkClipboard]);

  // Main Save button handler
  const handleMainSaveClick = async () => {
    // Check clipboard directly on tap (highest privilege user gesture)
    let urlToSave: string | null = null;
    try {
      urlToSave = await readClipboardUrlSafely();
    } catch {
      // Safe fallback
    }

    if (!urlToSave) {
      urlToSave = detectedClipboardUrl;
    }

    // If a valid URL is found in clipboard:
    if (urlToSave) {
      // Check for duplicates
      const isDuplicate = savedItems.some(
        (item) => item.url && normalizeUrl(item.url) === normalizeUrl(urlToSave!)
      );

      if (isDuplicate) {
        triggerHaptic('medium');
        onShowToast('Эта ссылка уже сохранена');
        return;
      }

      // Automatically save the clipboard URL into "Разное"
      triggerHaptic('success');
      lastSavedUrlRef.current = urlToSave;
      onSaveClipboardLink(urlToSave);
      setDetectedClipboardUrl(null);
      onShowToast('Сохранено');
      return;
    }

    // Fallback: If no URL in clipboard, open the standard Save Link modal
    triggerHaptic('medium');
    onOpenSaveLink();
  };

  return (
    <div
      id="screen-home"
      className="relative flex-1 w-full flex flex-col justify-between px-5 pt-[70px] pb-[44px] select-none overflow-hidden"
    >
      {/* 1. Upper Group: Brand, Statistics & Search (moved slightly down towards bubbles) */}
      <div className="relative z-10 flex flex-col gap-5">
        {/* Brand & Stats */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            {/* SnapKeep Logo: static circular loading-indicator symbol */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F2F3F5"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <line x1="12" y1="2.5" x2="12" y2="6.5" />
              <line x1="12" y1="17.5" x2="12" y2="21.5" />
              <line x1="5.28" y1="5.28" x2="8.11" y2="8.11" />
              <line x1="15.89" y1="15.89" x2="18.72" y2="18.72" />
              <line x1="2.5" y1="12" x2="6.5" y2="12" />
              <line x1="17.5" y1="12" x2="21.5" y2="12" />
              <line x1="5.28" y1="18.72" x2="8.11" y2="15.89" />
              <line x1="15.89" y1="8.11" x2="18.72" y2="5.28" />
            </svg>
            <span
              className="text-[#F2F3F5] font-medium tracking-tight"
              style={{ fontSize: '16px', lineHeight: '20px', letterSpacing: '-0.01em' }}
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

        {/* Full-width Search Trigger Button (Matte tile with soft specular reflection) */}
        <button
          id="home-search-trigger"
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenSearch();
          }}
          className="w-full rounded-[18px] py-3.5 px-4 flex items-center gap-3 cursor-pointer text-left transition-all active:opacity-85 matte-tile"
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
      </div>

      {/* 2. Middle Group: Category Chips (Remains centered in its current position) */}
      <div className="relative z-10 my-auto py-2">
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
                className="rounded-[20px] px-4 py-2 min-h-[34px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] matte-chip"
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

      {/* 3. Lower Group: Main Save Action & Secondary Buttons (moved slightly up towards bubbles) */}
      <div className="relative z-10 flex flex-col gap-3">
        {/* Main Save Action Container */}
        <div className="flex flex-col gap-1.5">
          <button
            id="main-save-action-button"
            type="button"
            onClick={handleMainSaveClick}
            className="w-full h-[60px] rounded-[18px] flex items-center justify-center gap-2 cursor-pointer font-medium snap-main-save-button"
            style={{
              color: '#111214',
              fontSize: '15px',
              lineHeight: '20px',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111214"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Сохранить</span>
          </button>

          {/* Compact string under "Сохранить" shown only when clipboard contains a link */}
          {detectedClipboardUrl && (
            <div className="text-center pt-0.5 animate-in fade-in duration-200">
              <span
                className="text-[#8E939C] font-normal truncate block max-w-full px-2"
                style={{ fontSize: '12px', lineHeight: '15px' }}
              >
                Из буфера: {formatShortUrl(detectedClipboardUrl)}
              </span>
            </div>
          )}
        </div>

        {/* Secondary actions: Ссылка & Заметка (Matte tactile surfaces) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="quick-save-link-button"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSaveLink();
            }}
            className="h-[50px] rounded-[16px] px-4 flex items-center justify-center gap-2 cursor-pointer font-normal transition-opacity active:opacity-80 matte-tile"
            style={{
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
            className="h-[50px] rounded-[16px] px-4 flex items-center justify-center gap-2 cursor-pointer font-normal transition-opacity active:opacity-80 matte-tile"
            style={{
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
      </div>
    </div>
  );
};
