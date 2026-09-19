/**
 * Normalizes URL for strict and robust deduplication.
 * Ensures:
 * - lowercase scheme and hostname
 * - trimmed whitespace
 * - removed default ports
 * - normalized trailing slashes (e.g. https://example.com/ -> https://example.com)
 * - stripped tracking query parameters (utm_*, fbclid, igshid)
 * - query parameter sorting for identical query comparison
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'igshid',
  'gclid',
  '_ga',
  '_gl',
  'mc_eid',
]);

export function normalizeUrlForComparison(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim();
  if (!cleaned) return '';

  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const u = new URL(cleaned);
    const protocol = u.protocol.toLowerCase();
    const hostname = u.hostname.toLowerCase().replace(/^www\./, '');

    let pathname = u.pathname;
    // Normalize trailing slash: root '/' becomes empty string, '/abc/' becomes '/abc'
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Filter out marketing/tracking parameters while keeping useful ones
    const searchParams = new URLSearchParams(u.search);
    const keysToDelete: string[] = [];
    searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      searchParams.delete(key);
    }

    searchParams.sort();
    const search = searchParams.toString() ? `?${searchParams.toString()}` : '';

    return `${protocol}//${hostname}${pathname}${search}`;
  } catch {
    return cleaned.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Extracts a clean display domain from a URL (e.g. "youtube.com", "github.com").
 */
export function extractDomainFromUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  try {
    const u = new URL(cleaned);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}
