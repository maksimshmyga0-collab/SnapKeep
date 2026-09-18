import type { SavedItem } from './types.js';
import {
  isSupabaseConfigured,
  getUserItemsSupabase,
  saveUserItemSupabase,
  updateUserItemSupabase,
  deleteUserItemSupabase,
  findUserDuplicateSupabase,
  type SaveItemInput,
  type SaveItemResult,
} from './supabase.js';
import { normalizeUrlForComparison } from './urlUtils.js';

export type { SaveItemInput, SaveItemResult };

// In-memory store used only when Supabase is not configured (e.g. offline local test)
const memoryStore: Map<string, SavedItem[]> = new Map();

function getMemoryItems(telegramUserId: string): SavedItem[] {
  return memoryStore.get(String(telegramUserId)) || [];
}

function setMemoryItems(telegramUserId: string, items: SavedItem[]): void {
  memoryStore.set(String(telegramUserId), items);
}

/**
 * Get all saved items for a specific Telegram user ID.
 */
export async function getUserItems(telegramUserId: string): Promise<SavedItem[]> {
  if (!telegramUserId) return [];

  if (isSupabaseConfigured()) {
    return getUserItemsSupabase(telegramUserId);
  }

  return getMemoryItems(telegramUserId);
}

/**
 * Checks if a URL has already been saved by this user.
 */
export async function findUserDuplicate(
  telegramUserId: string,
  url: string
): Promise<SavedItem | undefined> {
  if (!telegramUserId || !url) return undefined;

  if (isSupabaseConfigured()) {
    return findUserDuplicateSupabase(telegramUserId, url);
  }

  const items = getMemoryItems(telegramUserId);
  const normalized = normalizeUrlForComparison(url);
  if (!normalized) return undefined;

  return items.find((item) => item.url && normalizeUrlForComparison(item.url) === normalized);
}

/**
 * Saves a new item for a Telegram user with deduplication.
 */
export async function saveUserItem(input: SaveItemInput): Promise<SaveItemResult> {
  if (isSupabaseConfigured()) {
    return saveUserItemSupabase(input);
  }

  const telegramUserId = String(input.telegramUserId || '');
  if (input.url) {
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
    textContent: input.textContent || undefined,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  const userItems = getMemoryItems(telegramUserId);
  userItems.unshift(newItem);
  setMemoryItems(telegramUserId, userItems);

  return { item: newItem, isDuplicate: false };
}

/**
 * Updates an existing item.
 */
export async function updateUserItem(
  id: string,
  updates: Partial<SavedItem>,
  telegramUserId?: string
): Promise<SavedItem | null> {
  if (isSupabaseConfigured()) {
    return updateUserItemSupabase(id, updates, telegramUserId);
  }

  for (const [uid, items] of memoryStore.entries()) {
    if (telegramUserId && uid !== String(telegramUserId)) continue;
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1) {
      const updated = { ...items[index], ...updates };
      items[index] = updated;
      return updated;
    }
  }

  return null;
}

/**
 * Deletes an item by ID.
 */
export async function deleteUserItem(id: string, telegramUserId?: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return deleteUserItemSupabase(id, telegramUserId);
  }

  for (const [uid, items] of memoryStore.entries()) {
    if (telegramUserId && uid !== String(telegramUserId)) continue;
    const initialLen = items.length;
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length !== initialLen) {
      memoryStore.set(uid, filtered);
      return true;
    }
  }

  return false;
}
