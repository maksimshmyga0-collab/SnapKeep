import { readTelegramClipboardText } from './telegram';

/**
 * Validates whether a string is a standard URL.
 * Supports http://, https://, and www. links.
 * Strictly ignores plain text.
 */
export function extractValidUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  let trimmed = text.trim();

  // Strip accidental outer quotes or angle brackets commonly added by messengers
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('<') && trimmed.endsWith('>')) ||
    (trimmed.startsWith('(') && trimmed.endsWith(')'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // Must not have internal spaces in a valid URL
  if (/\s/.test(trimmed)) return null;

  // Must start with http://, https://, or www.
  const urlPrefixPattern = /^(https?:\/\/|www\.)/i;
  if (!urlPrefixPattern.test(trimmed)) {
    return null;
  }

  // Prepend protocol if starting with www.
  const withProtocol = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Must have a valid hostname with at least one dot or be localhost
    const host = parsed.hostname;
    if (!host || host.endsWith('.')) {
      return null;
    }

    if (host !== 'localhost') {
      const parts = host.split('.');
      if (parts.length < 2 || parts.some((p) => p.length === 0)) {
        return null;
      }
      const tld = parts[parts.length - 1];
      if (tld.length < 2 && !/^\d+$/.test(tld)) {
        return null;
      }
    }

    return withProtocol;
  } catch {
    return null;
  }
}

/**
 * Formats a URL for compact single-line display under the Save button.
 * Example: "youtube.com/watch..." or "instagram.com/p/..."
 */
export function formatShortUrl(urlStr: string): string {
  try {
    const withProto = /^www\./i.test(urlStr.trim()) ? `https://${urlStr.trim()}` : urlStr.trim();
    const parsed = new URL(withProto);
    const host = parsed.hostname.replace(/^www\./i, '');
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    const search = parsed.search || '';

    const combined = host + pathname + search;
    if (combined.length > 28) {
      return combined.slice(0, 26) + '...';
    }
    return combined;
  } catch {
    const clean = urlStr.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    if (clean.length > 28) {
      return clean.slice(0, 26) + '...';
    }
    return clean;
  }
}

/**
 * Normalizes a URL for accurate duplicate detection.
 */
export function normalizeUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    let trimmed = url.trim().replace(/\/+$/, '');
    if (/^www\./i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const search = parsed.search || '';
    return `${protocol}//${hostname}${pathname}${search}`;
  } catch {
    return url
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Reads clipboard safely using standard browser Clipboard API,
 * with Telegram WebApp bridge fallback. Never throws or crashes.
 */
export async function readClipboardUrlSafely(): Promise<string | null> {
  // 1. First attempt standard browser Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    try {
      const text = await navigator.clipboard.readText();
      const valid = extractValidUrl(text);
      if (valid) return valid;
    } catch {
      // Permission denied or document not focused in iframe - handled silently
    }
  }

  // 2. Telegram WebApp bridge fallback (for Telegram Mini App environment)
  try {
    const tgText = await readTelegramClipboardText();
    const validTg = extractValidUrl(tgText);
    if (validTg) return validTg;
  } catch {
    // Handled silently
  }

  return null;
}

