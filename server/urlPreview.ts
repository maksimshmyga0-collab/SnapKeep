import dns from 'dns';
import { extractDomainFromUrl } from './urlUtils.js';

export interface UrlPreviewResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  domain: string;
  status: 'ready' | 'failed';
}

const MAX_HTML_BYTES = 1024 * 1024; // 1 MB limit for <head> metadata
const REQUEST_TIMEOUT_MS = 6000; // 6 seconds safe timeout

/**
 * Checks if an IPv4 address belongs to a private, loopback, link-local,
 * carrier-grade NAT, or cloud metadata network.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed -> treat as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata, e.g. AWS/GCP 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation/test)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;
  // 255.255.255.255 (Broadcast)
  if (parts.every((p) => p === 255)) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private, link-local, loopback, or mapped IPv4.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback (::1) and unspecified (::)
  if (normalized === '::1' || normalized === '::') return true;
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  // Unique local (fc00::/7, fd00::/8)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part && ipv4Part.includes('.')) {
      return isPrivateIPv4(ipv4Part);
    }
    return true;
  }
  return false;
}

/**
 * Validates a hostname and performs DNS lookup to ensure it is not pointing to an internal/private address.
 */
async function validateSafeHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().trim();

  // 1. Check known dangerous hostnames
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === 'instance-data' ||
    host.includes('metadata.google.internal') ||
    host.includes('169.254.169.254')
  ) {
    return false;
  }

  // 2. If it's a literal IP
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return !isPrivateIPv4(host);
  }
  if (host.includes(':')) {
    return !isPrivateIPv6(host);
  }

  // 3. DNS resolution check to prevent DNS rebinding
  try {
    const lookup = await dns.promises.lookup(host, { all: true });
    for (const record of lookup) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return false;
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return false;
      }
    }
  } catch {
    // If DNS resolution fails, reject safe host check
    return false;
  }

  return true;
}

/**
 * Decodes common HTML entities.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .trim();
}

/**
 * Resolves a potentially relative image URL against the page's base URL,
 * decoding any HTML entities first.
 */
function resolveAbsoluteImageUrl(imgUrl: string, baseUrl: string): string | null {
  if (!imgUrl || !imgUrl.trim()) return null;
  const raw = decodeHtmlEntities(imgUrl.trim());

  // Reject data URIs or non-http protocols
  if (raw.startsWith('data:') || raw.startsWith('javascript:')) {
    return null;
  }

  try {
    const resolved = new URL(raw, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts a deterministic YouTube thumbnail URL (hqdefault.jpg) from YouTube URLs.
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
function extractYouTubeThumbnail(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    let clean = urlStr.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | null = null;

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        videoId = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/live/')) {
        const parts = u.pathname.split('/');
        videoId = parts[2] || null;
      }
    } else if (host === 'youtu.be') {
      videoId = u.pathname.slice(1).split('/')[0] || null;
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      // Must strictly be HTTPS
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {}
  return null;
}

/**
 * Extracts meta tags and <title> from HTML using robust regular expressions.
 */
function parseHtmlMetadata(html: string, baseUrl: string): {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
} {
  const metaRegex = /<meta\s+([^>]+)>/gi;
  const metas: Record<string, string> = {};

  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    // Find property/name
    const nameMatch = attrs.match(/(?:name|property)\s*=\s*(["'])(.*?)\1/i);
    const contentMatch = attrs.match(/content\s*=\s*(["'])(.*?)\1/i);

    if (nameMatch && contentMatch) {
      const key = nameMatch[2].toLowerCase().trim();
      const val = contentMatch[2];
      if (!metas[key]) {
        metas[key] = val;
      }
    }
  }

  // Find <title>
  let docTitle: string | null = null;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    docTitle = titleMatch[1].replace(/\s+/g, ' ').trim();
  }

  // Priority for title:
  // 1. og:title
  // 2. twitter:title
  // 3. <title>
  const rawTitle = metas['og:title'] || metas['twitter:title'] || docTitle || null;
  const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;

  // Priority for description:
  // 1. og:description
  // 2. twitter:description
  // 3. meta description
  const rawDesc = metas['og:description'] || metas['twitter:description'] || metas['description'] || null;
  const description = rawDesc ? decodeHtmlEntities(rawDesc) : null;

  // Priority for image:
  // 1. og:image
  // 2. twitter:image
  const rawImage = metas['og:image'] || metas['og:image:url'] || metas['twitter:image'] || metas['twitter:image:src'] || null;
  const imageUrl = rawImage ? resolveAbsoluteImageUrl(rawImage, baseUrl) : null;

  return {
    title,
    description,
    imageUrl,
  };
}

/**
 * Fetches OpenGraph/Twitter/HTML metadata for a given URL on the server side.
 * Protected against SSRF, timeouts, large downloads, and non-HTML mime types.
 *
 * Never throws — always returns a valid UrlPreviewResult.
 */
export async function fetchUrlPreview(rawUrl: string): Promise<UrlPreviewResult> {
  const domain = extractDomainFromUrl(rawUrl);
  const fallbackResult: UrlPreviewResult = {
    title: null,
    description: null,
    imageUrl: null,
    domain,
    status: 'failed',
  };

  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallbackResult;
  }

  let parsedUrl: URL;
  try {
    let cleanUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    parsedUrl = new URL(cleanUrl);
  } catch {
    return fallbackResult;
  }

  // 1. Protocol validation (strictly http or https)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return fallbackResult;
  }

  // 2. SSRF check on hostname and resolved IP
  try {
    const isSafe = await validateSafeHost(parsedUrl.hostname);
    if (!isSafe) {
      console.warn(`[SSRF Prevention] Blocked unsafe target host: ${parsedUrl.hostname}`);
      return fallbackResult;
    }
  } catch {
    return fallbackResult;
  }

  // 3. Perform server-side fetch with timeout and header controls
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php); TelegramBot',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const ytFallback = extractYouTubeThumbnail(parsedUrl.toString()) || extractYouTubeThumbnail(rawUrl);
      if (ytFallback) {
        return {
          title: null,
          description: null,
          imageUrl: ytFallback,
          domain,
          status: 'ready',
        };
      }
      return fallbackResult;
    }

    // 4. Validate Content-Type: must be HTML
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      const ytFallback = extractYouTubeThumbnail(parsedUrl.toString()) || extractYouTubeThumbnail(rawUrl);
      if (ytFallback) {
        return {
          title: null,
          description: null,
          imageUrl: ytFallback,
          domain,
          status: 'ready',
        };
      }
      return fallbackResult;
    }

    // 5. Read response body with strict byte limit
    let html = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let bytesRead = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          bytesRead += value.length;
          html += decoder.decode(value, { stream: true });
        }

        // Once we've accumulated enough HTML (or reached the end of <head>), stop reading
        if (bytesRead >= MAX_HTML_BYTES || html.includes('</head>')) {
          reader.cancel().catch(() => {});
          break;
        }
      }
    } else {
      const fullText = await response.text();
      html = fullText.slice(0, MAX_HTML_BYTES);
    }

    // 6. Parse metadata
    const finalUrl = response.url || parsedUrl.toString();
    const finalDomain = extractDomainFromUrl(finalUrl) || domain;
    const { title, description, imageUrl } = parseHtmlMetadata(html, finalUrl);

    // Apply YouTube fallback if image was not found from og:image / twitter:image
    const finalImageUrl =
      imageUrl ||
      extractYouTubeThumbnail(finalUrl) ||
      extractYouTubeThumbnail(rawUrl) ||
      null;

    // If we have at least a title, description, or image, mark status as ready
    const hasData = Boolean(
      (title && title.length > 0) ||
      (description && description.length > 0) ||
      finalImageUrl
    );

    return {
      title: title || null,
      description: description || null,
      imageUrl: finalImageUrl,
      domain: finalDomain,
      status: hasData ? 'ready' : 'failed',
    };
  } catch (err: any) {
    // Network error, abort/timeout, or TLS error -> check YouTube fallback or graceful fallback
    const ytFallback = extractYouTubeThumbnail(parsedUrl.toString()) || extractYouTubeThumbnail(rawUrl);
    if (ytFallback) {
      return {
        title: null,
        description: null,
        imageUrl: ytFallback,
        domain,
        status: 'ready',
      };
    }
    return fallbackResult;
  }
}
