import fs from 'fs';
import path from 'path';
import { SavedItem, CategoryName, SourceKind } from '../src/types';
import { normalizeUrlForComparison } from './urlUtils';
import {
  getFirestore,
  getUserItemsFirestore,
  findUserDuplicateFirestore,
  saveUserItemFirestore,
  updateUserItemFirestore,
  deleteUserItemFirestore,
  SaveItemInput,
  SaveItemResult,
} from './firestore';

export { normalizeUrlForComparison };
export type { SaveItemInput, SaveItemResult };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'snapkeep_db.json');

// Ensure data directory exists for local fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseStructure {
  items: SavedItem[];
}

let inMemoryItems: SavedItem[] | null = null;
let migrationDone = false;

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
    console.error('[DB] Error reading local database file:', err);
  }

  inMemoryItems = [];
  return { items: inMemoryItems };
}

function persistLocalDb(): void {
  try {
    const data: DatabaseStructure = { items: inMemoryItems || [] };
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Error persisting local database file:', err);
  }
}

/**
 * Migrates local JSON records to Firestore if Firestore is active and empty.
 */
async function autoMigrateToFirestoreIfNeeded(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;

  const db = getFirestore();
  if (!db) return;

  try {
    const snapshot = await db.collection('items').limit(1).get();
    if (snapshot.empty) {
      const local = loadLocalDb();
      if (local.items.length > 0) {
        console.log(`[Storage Migration] Migrating ${local.items.length} items from local JSON to Firestore...`);
        const batch = db.batch();
        for (const it of local.items) {
          const docRef = db.collection('items').doc(it.id);
          batch.set(docRef, it);
        }
        await batch.commit();
        console.log('[Storage Migration] Migration completed successfully.');
      }
    }
  } catch (err) {
    console.warn('[Storage Migration] Auto-migration check skipped:', err);
  }
}

/**
 * Determine if Firestore should be used.
 * In production, Firestore is prioritized.
 */
function isFirestoreEnabled(): boolean {
  if (process.env.FORCE_LOCAL_DB === 'true') {
    return false;
  }
  return Boolean(getFirestore());
}

/**
 * Get all items for a specific Telegram user ID.
 * Returns newest items first.
 */
export async function getUserItems(telegramUserId: string): Promise<SavedItem[]> {
  if (isFirestoreEnabled()) {
    try {
      await autoMigrateToFirestoreIfNeeded();
      return await getUserItemsFirestore(telegramUserId);
    } catch (err) {
      console.error('[Firestore Error] getUserItems failed, falling back to local storage:', err);
    }
  }

  // Local JSON fallback
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

  if (isFirestoreEnabled()) {
    try {
      return await findUserDuplicateFirestore(telegramUserId, url);
    } catch (err) {
      console.error('[Firestore Error] findUserDuplicate failed, checking local:', err);
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
 * In Cloud Run production: saved to Firestore.
 * Fallback: local JSON database.
 */
export async function saveUserItem(input: SaveItemInput): Promise<SaveItemResult> {
  if (isFirestoreEnabled()) {
    try {
      await autoMigrateToFirestoreIfNeeded();
      const result = await saveUserItemFirestore(input);
      return result;
    } catch (err) {
      console.error('[Firestore Error] saveUserItem failed, falling back to local:', err);
    }
  }

  // Local JSON storage
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
  if (isFirestoreEnabled()) {
    try {
      return await updateUserItemFirestore(id, updates, telegramUserId);
    } catch (err) {
      console.error('[Firestore Error] updateUserItem failed, trying local:', err);
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
  if (isFirestoreEnabled()) {
    try {
      return await deleteUserItemFirestore(id, telegramUserId);
    } catch (err) {
      console.error('[Firestore Error] deleteUserItem failed, trying local:', err);
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
