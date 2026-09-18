/**
 * Normalizes URL for strict and robust deduplication.
 * Ensures:
 * - lowercase scheme and hostname
 * - trimmed whitespace
 * - removed default ports
 * - normalized trailing slashes
 * - query parameter sorting for identical query comparison
 */
export function normalizeUrlForComparison(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  if (!cleaned) return '';

  if (!/^https?:\/\//i.test(cleaned)) {
    if (cleaned.startsWith('www.')) {
      cleaned = 'https://' + cleaned;
    } else {
      cleaned = 'https://' + cleaned;
    }
  }

  try {
    const u = new URL(cleaned);
    const protocol = u.protocol.toLowerCase();
    const hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = u.pathname;
    // Normalize trailing slash if it's longer than root '/'
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    u.searchParams.sort();
    const search = u.searchParams.toString() ? `?${u.searchParams.toString()}` : '';
    return `${protocol}//${hostname}${pathname}${search}`;
  } catch {
    return cleaned.toLowerCase().replace(/\/+$/, '');
  }
}
