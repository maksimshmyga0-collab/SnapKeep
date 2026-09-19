import React, { useState } from 'react';
import { SavedItem } from '../types';
import { triggerHaptic } from '../services/telegram';

interface ItemCardProps {
  item: SavedItem;
  searchQuery?: string;
  onOpenDetails: (item: SavedItem) => void;
}

/**
 * Extracts a clean domain from a URL for fallback display.
 */
function getCleanDomain(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    let clean = rawUrl.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Highlights matching search text safely.
 */
function renderHighlightedText(text: string, query?: string) {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={index} style={{ color: '#8FA3DE', fontWeight: 500 }}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, searchQuery = '', onOpenDetails }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const isLink = Boolean(item.url);
  const domain = item.previewDomain || getCleanDomain(item.url);

  // Priority for title: previewTitle -> item.title -> domain -> fallback
  const displayTitle = item.previewTitle || item.title || domain || (isLink ? 'Ссылка' : 'Заметка');
  const displayDescription = item.previewDescription || (!isLink ? item.textContent : undefined);
  const hasValidImage = Boolean(isLink && item.previewImageUrl && !imageFailed);
  const isPending = item.previewStatus === 'pending' && isLink && !item.previewTitle && !item.previewImageUrl;

  const handleCardClick = () => {
    triggerHaptic('light');
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      onOpenDetails(item);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onOpenDetails(item);
  };

  // ---------------------------------------------------------------------------
  // Case A: Visual Preview Card with Image (OG/Twitter/Page Image)
  // ---------------------------------------------------------------------------
  if (hasValidImage) {
    return (
      <div
        onClick={handleCardClick}
        className="w-full rounded-2xl overflow-hidden cursor-pointer transition-all active:opacity-90 matte-tile flex flex-col"
      >
        {/* Top Preview Image Container */}
        <div className="w-full h-[148px] bg-[#121418] relative overflow-hidden shrink-0 border-b border-[rgba(255,255,255,0.06)]">
          <img
            src={item.previewImageUrl!}
            alt={displayTitle}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Card Body */}
        <div className="p-3.5 flex flex-col flex-1">
          {/* Title (max 2 lines) */}
          <h4 className="text-[#F2F3F5] text-[14px] font-medium leading-snug line-clamp-2 mb-1">
            {renderHighlightedText(displayTitle, searchQuery)}
          </h4>

          {/* Description (max 2 lines, if present) */}
          {displayDescription && (
            <p className="text-[#8E939C] text-[12.5px] font-normal leading-relaxed line-clamp-2 mb-1.5">
              {renderHighlightedText(displayDescription, searchQuery)}
            </p>
          )}

          {/* Domain */}
          {domain && (
            <div className="text-[#6C717A] text-[11.5px] font-normal leading-none mb-2.5 truncate">
              {domain}
            </div>
          )}

          {/* Bottom Row: Category & More Actions button (⋯) */}
          <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.05)] mt-auto">
            <span className="text-[#8E939C] text-[12px] font-normal">
              {item.category}
            </span>

            <button
              type="button"
              onClick={handleMoreClick}
              aria-label="Действия с ссылкой"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8E939C] hover:text-[#F2F3F5] active:bg-[rgba(255,255,255,0.06)] transition-colors -mr-1 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Case B: Compact Card (No image / Image failed / Fallback / Pending / Note)
  // Compact card without empty placeholder box
  // ---------------------------------------------------------------------------
  return (
    <div
      onClick={handleCardClick}
      className={`w-full rounded-2xl p-3.5 cursor-pointer transition-all active:opacity-90 matte-tile flex flex-col gap-2 ${
        isPending ? 'animate-pulse' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Source / Kind Icon (34px) */}
        <div
          className="w-[34px] h-[34px] rounded-xl shrink-0 flex items-center justify-center mt-0.5"
          style={{
            backgroundColor: 'rgba(90, 109, 166, 0.22)',
            border: '1px solid rgba(140, 157, 214, 0.28)',
            color: '#C8D2F0',
          }}
        >
          {item.sourceKind === 'video' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          ) : !isLink ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-[#F2F3F5] text-[14px] font-normal leading-snug line-clamp-2 mb-0.5">
            {renderHighlightedText(displayTitle, searchQuery)}
          </h4>

          {displayDescription && (
            <p className="text-[#8E939C] text-[12.5px] font-normal leading-snug line-clamp-2 mb-1">
              {renderHighlightedText(displayDescription, searchQuery)}
            </p>
          )}

          {domain && (
            <div className="text-[#6C717A] text-[11.5px] font-normal leading-none truncate">
              {domain}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Category and Action button (⋯) */}
      <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.05)] mt-0.5">
        <span className="text-[#8E939C] text-[12px] font-normal">
          {item.category} {!isLink ? '· заметка' : ''}
        </span>

        <button
          type="button"
          onClick={handleMoreClick}
          aria-label="Действия"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8E939C] hover:text-[#F2F3F5] active:bg-[rgba(255,255,255,0.06)] transition-colors -mr-1 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
