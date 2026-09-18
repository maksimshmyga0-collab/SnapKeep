import fs from 'fs';
import path from 'path';
import type { SavedItem, CategoryName, SourceKind } from './types';
import { normalizeUrlForComparison } from './urlUtils';
import {
  isSupabaseConfigured,
  getSupabase,
  getUserItemsSupabase,
  findUserDuplicateSupabase,
  saveUserItemSupabase,
  updateUserItemSupabase,
  deleteUserItemSupabase,
  type SaveItemInput,
  type SaveItemResult,
} from './supabase';

export { normalizeUrlForComparison };
export type { SaveItemInput, SaveItemResult };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'snapkeep_db.json');

// Local in-memory cache for development fallback
interface DatabaseStructure {
  items: SavedItem[];
}

let inMemoryItems: SavedItem[] | null = null;
let migrationChecked = false;

function loadLocalDb(): DatabaseStructure {
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
    console.error('[DB Fallback] Error reading local db file:', err);
  }

  inMemoryItems = [];
  return { items: inMemoryItems };
}

function persistLocalDb(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data: DatabaseStructure = { items: inMemoryItems || [] };
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB Fallback] Error persisting local db file:', err);
  }
}

/**
 * Migrates local development items to Supabase if Supabase is active and empty.
 */
async function autoMigrateToSupabaseIfNeeded(): Promise<void> {
  if (migrationChecked) return;
  migrationChecked = true;

  if (!isSupabaseConfigured()) return;
  const client = getSupabase();
  if (!client) return;

  try {
    const { count, error } = await client
      .from('items')
      .select('*', { count: 'exact', head: true });

    if (!error && (count === 0 || count === null)) {
      const local = loadLocalDb();
      if (local.items.length > 0) {
        console.log(`[Storage Migration] Migrating ${local.items.length} items from local JSON to Supabase...`);
        for (const item of local.items) {
          try {
            await saveUserItemSupabase({
              telegramUserId: item.telegramUserId || 'unknown',
              url: item.url,
              title: item.title,
              sourceKind: item.sourceKind,
              sourceLabel: item.sourceLabel,
              category: item.category,
              textContent: item.textContent,
              createdAt: item.createdAt,
            });
          } catch (e) {
            // Ignore duplicate or individual item migration warnings
          }
        }
        console.log('[Storage Migration] Migration to Supabase finished.');
      }
    }
  } catch (err) {
    console.warn('[Storage Migration] Migration check skipped:', err);
  }
}

/**
 * Get all items for a specific Telegram user ID.
 * Returns newest items first.
 */
export async function getUserItems(telegramUserId: string): Promise<SavedItem[]> {
  if (isSupabaseConfigured()) {
    try {
      await autoMigrateToSupabaseIfNeeded();
      return await getUserItemsSupabase(telegramUserId);
    } catch (err) {
      console.error('[Supabase Error] getUserItems failed, checking local fallback:', err);
    }
  }

  // Local JSON fallback (development only)
  const { items } = loadLocalDb();
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
export async function findUserDuplicate(
  telegramUserId: string,
  url: string
): Promise<SavedItem | undefined> {
  if (!url || !telegramUserId) return undefined;

  if (isSupabaseConfigured()) {
    try {
      return await findUserDuplicateSupabase(telegramUserId, url);
    } catch (err) {
      console.error('[Supabase Error] findUserDuplicate failed, checking local fallback:', err);
    }
  }

  const { items } = loadLocalDb();
  const normalizedTarget = normalizeUrlForComparison(url);

  return items.find((item) => {
    if (String(item.telegramUserId || '') !== String(telegramUserId)) {
      return false;
    }
    if (!item.url) return false;
    return normalizeUrlForComparison(item.url) === normalizedTarget;
  });
}

/**
 * Save an item with deduplication check per Telegram user.
 * In production: saved to Supabase PostgreSQL with unique index constraint.
 * Fallback: local JSON database.
 */
export async function saveUserItem(input: SaveItemInput): Promise<SaveItemResult> {
  if (isSupabaseConfigured()) {
    try {
      await autoMigrateToSupabaseIfNeeded();
      return await saveUserItemSupabase(input);
    } catch (err) {
      console.error('[Supabase Error] saveUserItem failed, falling back to local storage:', err);
    }
  }

  // Local JSON fallback (development only)
  const { items } = loadLocalDb();
  const telegramUserId = String(input.telegramUserId || '').trim();

  if (input.url && telegramUserId) {
    const existing = await findUserDuplicate(telegramUserId, input.url);
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
  persistLocalDb();

  return { item: newItem, isDuplicate: false };
}

/**
 * Update an existing item (e.g. category)
 */
export async function updateUserItem(
  id: string,
  updates: Partial<SavedItem>,
  telegramUserId?: string
): Promise<SavedItem | null> {
  if (isSupabaseConfigured()) {
    try {
      return await updateUserItemSupabase(id, updates, telegramUserId);
    } catch (err) {
      console.error('[Supabase Error] updateUserItem failed, trying local fallback:', err);
    }
  }

  const { items } = loadLocalDb();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const current = items[index];
  if (telegramUserId && String(current.telegramUserId || '') !== String(telegramUserId)) {
    return null;
  }

  const updated: SavedItem = {
    ...current,
    ...updates,
    id: current.id,
    telegramUserId: current.telegramUserId,
  };

  items[index] = updated;
  persistLocalDb();
  return updated;
}

/**
 * Delete an item by ID
 */
export async function deleteUserItem(id: string, telegramUserId?: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      return await deleteUserItemSupabase(id, telegramUserId);
    } catch (err) {
      console.error('[Supabase Error] deleteUserItem failed, trying local fallback:', err);
    }
  }

  const { items } = loadLocalDb();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return false;

  if (telegramUserId && String(items[index].telegramUserId || '') !== String(telegramUserId)) {
    return false;
  }

  inMemoryItems = items.filter((i) => i.id !== id);
  persistLocalDb();
  return true;
}
