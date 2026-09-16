import fs from 'fs';
import path from 'path';
import { SavedItem, CategoryName, SourceKind } from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'snapkeep_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseStructure {
  items: SavedItem[];
}

let inMemoryItems: SavedItem[] | null = null;

function loadDb(): DatabaseStructure {
  if (inMemoryItems !== null) {
    return { items: inMemoryItems };
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.items)) {
        inMemoryItems = parsed.items;
        return { items: inMemoryItems };
      }
    }
  } catch (err) {
    console.error('[DB] Error reading database file:', err);
  }

  inMemoryItems = [];
  return { items: inMemoryItems };
}

function persistDb(): void {
  try {
    const data: DatabaseStructure = { items: inMemoryItems || [] };
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Error persisting database file:', err);
  }
}

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

/**
 * Get all items for a specific Telegram user ID.
 * Items are returned sorted newest first.
 */
export function getUserItems(telegramUserId: string): SavedItem[] {
  const { items } = loadDb();
  // Filter by telegramUserId (or fallback to match if no userId is supplied)
  const userItems = items.filter(
    (item) => String(item.telegramUserId || '') === String(telegramUserId)
  );
  return userItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Find if a specific URL has already been saved by this Telegram user.
 */
export function findUserDuplicate(
  telegramUserId: string,
  url: string
): SavedItem | undefined {
  if (!url || !telegramUserId) return undefined;
  const { items } = loadDb();
  const normalizedTarget = normalizeUrlForComparison(url);

  return items.find((item) => {
    if (String(item.telegramUserId || '') !== String(telegramUserId)) {
      return false;
    }
    if (!item.url) return false;
    return normalizeUrlForComparison(item.url) === normalizedTarget;
  });
}

export interface SaveItemInput {
  telegramUserId: string;
  url?: string;
  title: string;
  sourceKind?: SourceKind;
  sourceLabel?: string;
  category?: CategoryName;
  textContent?: string;
  createdAt?: string;
}

export interface SaveItemResult {
  item: SavedItem;
  isDuplicate: boolean;
}

/**
 * Save an item with deduplication check per telegram user.
 * If duplicate, returns existing item with isDuplicate = true.
 */
export function saveUserItem(input: SaveItemInput): SaveItemResult {
  const { items } = loadDb();
  const telegramUserId = String(input.telegramUserId || '').trim();

  // If item has a URL, check for duplicate within this user's library
  if (input.url && telegramUserId) {
    const existing = findUserDuplicate(telegramUserId, input.url);
    if (existing) {
      return { item: existing, isDuplicate: true };
    }
  }

  const newItem: SavedItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    telegramUserId,
    title: input.title.trim() || (input.url ? 'Ссылка' : 'Заметка'),
    url: input.url ? input.url.trim() : undefined,
    sourceKind: input.sourceKind || (input.url ? 'article' : 'note'),
    sourceLabel: input.sourceLabel || (input.url ? 'ссылка' : 'заметка'),
    category: input.category || 'Разное',
    textContent: input.textContent,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  items.unshift(newItem);
  persistDb();

  return { item: newItem, isDuplicate: false };
}

/**
 * Update an existing item (e.g. category)
 */
export function updateUserItem(
  id: string,
  updates: Partial<SavedItem>
): SavedItem | null {
  const { items } = loadDb();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const current = items[index];
  const updated: SavedItem = {
    ...current,
    ...updates,
    id: current.id, // ID must remain immutable
    telegramUserId: current.telegramUserId,
  };

  items[index] = updated;
  persistDb();
  return updated;
}

/**
 * Delete an item by ID
 */
export function deleteUserItem(id: string): boolean {
  const { items } = loadDb();
  const initialLength = items.length;
  inMemoryItems = items.filter((i) => i.id !== id);

  if (inMemoryItems.length !== initialLength) {
    persistDb();
    return true;
  }
  return false;
}
