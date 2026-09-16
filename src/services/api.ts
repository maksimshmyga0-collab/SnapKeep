import { SavedItem, CategoryName } from '../types';
import { getTelegramUser } from './telegram';

const FALLBACK_USER_STORAGE_KEY = 'snapkeep_client_user_id';

/**
 * Returns the current Telegram user ID.
 * Priority:
 * 1. window.Telegram.WebApp.initDataUnsafe.user.id
 * 2. ?telegramUserId= or ?userId= from location query
 * 3. Persistent localStorage ID for browser preview
 */
export function getCurrentTelegramUserId(): string {
  if (typeof window === 'undefined') return 'default_user';

  // 1. Real Telegram User ID
  const tgUser = getTelegramUser();
  if (tgUser && tgUser.id) {
    return String(tgUser.id);
  }

  // 2. URL Query Param (useful for dev / preview testing)
  try {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('telegramUserId') || params.get('userId');
    if (fromParam && fromParam.trim()) {
      return fromParam.trim();
    }
  } catch {}

  // 3. Fallback persistent ID for local browser
  try {
    let stored = localStorage.getItem(FALLBACK_USER_STORAGE_KEY);
    if (!stored) {
      stored = `user_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(FALLBACK_USER_STORAGE_KEY, stored);
    }
    return stored;
  } catch {
    return 'default_user';
  }
}

/**
 * Fetches all saved items for the current user from the shared server database.
 */
export async function fetchServerItems(telegramUserId: string): Promise<SavedItem[]> {
  try {
    const res = await fetch(`/api/items?telegramUserId=${encodeURIComponent(telegramUserId)}`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.warn('[API] Could not fetch server items:', err);
    throw err;
  }
}

/**
 * Saves a new item to the shared server database.
 * Returns the created item (or existing item if duplicate).
 */
export async function saveServerItem(
  itemData: Omit<SavedItem, 'id' | 'createdAt'> & { telegramUserId: string }
): Promise<{ item: SavedItem; isDuplicate: boolean }> {
  const res = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });

  if (!res.ok) {
    throw new Error(`Failed to save item on server (status ${res.status})`);
  }

  const data = await res.json();
  return data;
}

/**
 * Updates an item on the shared server database.
 */
export async function updateServerItem(
  id: string,
  updates: Partial<SavedItem>
): Promise<SavedItem | null> {
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.item || null;
  } catch (err) {
    console.warn('[API] Failed to update item:', err);
    return null;
  }
}

/**
 * Deletes an item on the shared server database.
 */
export async function deleteServerItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('[API] Failed to delete item:', err);
    return false;
  }
}
