/**
 * Clipboard detection and URL extraction utilities
 */

/**
 * Validates whether a string is a standard URL.
 * Supports http://, https://, and www. links.
 * Ignores plain text.
 */
export function extractValidUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Basic sanity check: no spaces and must look like a URL
  if (/\s/.test(trimmed)) return null;

  // Must start with http://, https://, or www.
  const urlPrefixPattern = /^(https?:\/\/|www\.)/i;
  if (!urlPrefixPattern.test(trimmed)) {
    return null;
  }

  // General URL validation
  try {
    const withProtocol = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
    const parsed = new URL(withProtocol);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      // Must have a valid hostname with at least one dot
      if (parsed.hostname && parsed.hostname.includes('.')) {
        return withProtocol;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Formats a URL for compact display under the Save button.
 * Example: "youtube.com/watch..." or "instagram.com/p/..."
 */
export function formatShortUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    const search = parsed.search ? parsed.search : '';

    let combined = host + pathname + search;
    if (combined.length > 26) {
      return combined.slice(0, 24) + '...';
    }
    return combined;
  } catch {
    if (urlStr.length > 26) {
      return urlStr.slice(0, 24) + '...';
    }
    return urlStr;
  }
}

/**
 * Normalizes a URL for accurate duplicate detection.
 */
export function normalizeUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const trimmed = url.trim().replace(/\/+$/, '');
    const withProto = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
    const parsed = new URL(withProto);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Reads clipboard safely without throwing errors or breaking UI.
 */
export async function readClipboardUrlSafely(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    return null;
  }

  try {
    const text = await navigator.clipboard.readText();
    return extractValidUrl(text);
  } catch {
    // Return null silently if user denied permission or if API is unavailable
    return null;
  }
}
