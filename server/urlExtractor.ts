import { SourceKind } from '../src/types';

export interface ExtractedUrlInfo {
  url: string;
  sourceLabel: string;
  sourceKind: SourceKind;
  title: string;
}

/**
 * Cleans a candidate string and validates whether it represents a real HTTP/HTTPS URL.
 * Strips surrounding whitespace, quotes, parentheses, brackets, and trailing punctuation.
 */
export function cleanAndValidateUrl(rawCandidate: string): string | null {
  if (!rawCandidate || typeof rawCandidate !== 'string') return null;

  let candidate = rawCandidate.trim();

  // Strip leading/trailing brackets, quotes, braces
  candidate = candidate.replace(/^[<(\["'«]+|[>)\]"'»]+$/g, '');

  // Strip trailing punctuation commonly appended in natural language sentences
  candidate = candidate.replace(/[.,!?;:]+$/, '');
  candidate = candidate.trim();

  if (!candidate) return null;

  // Add https:// to www. links
  if (/^www\./i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  // Must begin with http:// or https://
  if (!/^https?:\/\//i.test(candidate)) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    // Hostname must contain at least one dot or be localhost
    if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Derives a human-readable title and metadata from the URL.
 */
export function deriveUrlMetadata(validUrl: string): ExtractedUrlInfo {
  let sourceLabel = 'ссылка';
  let sourceKind: SourceKind = 'article';
  let title = 'Ссылка';

  try {
    const parsed = new URL(validUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    sourceLabel = host;

    const lowerUrl = validUrl.toLowerCase();
    const isVideo =
      lowerUrl.includes('youtube.com') ||
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('tiktok.com') ||
      lowerUrl.includes('vimeo.com') ||
      lowerUrl.includes('instagram.com/reel') ||
      lowerUrl.includes('instagram.com/reels');

    if (isVideo) {
      sourceKind = 'video';
    }

    // Platform-specific friendly titles
    if (host.includes('threads.net')) {
      title = 'Пост в Threads';
    } else if (host.includes('instagram.com')) {
      title = isVideo ? 'Reels в Instagram' : 'Публикация в Instagram';
    } else if (host.includes('youtube.com') || host.includes('youtu.be')) {
      title = 'Видео на YouTube';
    } else if (host.includes('tiktok.com')) {
      title = 'Видео в TikTok';
    } else if (host.includes('t.me') || host.includes('telegram.org')) {
      title = 'Ссылка в Telegram';
    } else if (host.includes('github.com')) {
      title = 'Репозиторий на GitHub';
    } else if (host.includes('x.com') || host.includes('twitter.com')) {
      title = 'Пост в X';
    } else {
      // Try path segments
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = decodeURIComponent(segments[segments.length - 1])
          .replace(/[-_]/g, ' ')
          .trim();
        if (last.length > 3) {
          title = last.slice(0, 60);
        } else {
          title = isVideo ? `Видео (${host})` : `Материал (${host})`;
        }
      } else {
        title = isVideo ? `Видео (${host})` : `Ссылка (${host})`;
      }
    }
  } catch {
    title = 'Сохранённая ссылка';
  }

  return {
    url: validUrl,
    sourceLabel,
    sourceKind,
    title,
  };
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
}

export interface TelegramMessagePayload {
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
}

/**
 * Extracts and deduplicates all valid URLs from an incoming Telegram message payload.
 * Evaluates both entities (type === 'url' | 'text_link') and regex on text and caption.
 */
export function extractUrlsFromTelegramMessage(
  payload: TelegramMessagePayload
): ExtractedUrlInfo[] {
  const urlsFound = new Set<string>();

  const text = payload.text || payload.caption || '';
  const entities = payload.entities || payload.caption_entities || [];

  // 1. Process Telegram entities if present
  if (Array.isArray(entities) && text) {
    for (const ent of entities) {
      if (ent.type === 'url') {
        const raw = text.substring(ent.offset, ent.offset + ent.length);
        const valid = cleanAndValidateUrl(raw);
        if (valid) urlsFound.add(valid);
      } else if (ent.type === 'text_link' && ent.url) {
        const valid = cleanAndValidateUrl(ent.url);
        if (valid) urlsFound.add(valid);
      }
    }
  }

  // 2. Regex fallback / scan for http://, https://, and www. in the entire text
  if (text) {
    const regex = /(https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const valid = cleanAndValidateUrl(match[0]);
      if (valid) {
        urlsFound.add(valid);
      }
    }
  }

  const results: ExtractedUrlInfo[] = [];
  for (const url of urlsFound) {
    results.push(deriveUrlMetadata(url));
  }

  return results;
}
