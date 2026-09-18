import { Firestore } from '@google-cloud/firestore';
import { SavedItem, CategoryName, SourceKind } from '../src/types';
import { normalizeUrlForComparison } from './urlUtils';

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

let firestoreInstance: Firestore | null = null;
let firestoreInitFailed = false;

/**
 * Initializes and returns the Google Cloud Firestore client.
 * Uses Application Default Credentials (ADC) attached to the Cloud Run service account.
 */
export function getFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  if (firestoreInitFailed) return null;

  try {
    const options: any = {};
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      options.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    }
    if (process.env.FIRESTORE_DATABASE_ID) {
      options.databaseId = process.env.FIRESTORE_DATABASE_ID;
    }

    firestoreInstance = new Firestore(options);
    console.log('[Firestore] Google Cloud Firestore client initialized successfully.');
    return firestoreInstance;
  } catch (err) {
    console.warn('[Firestore] Could not initialize Firestore client (fallback to local storage):', err);
    firestoreInitFailed = true;
    return null;
  }
}

const COLLECTION_NAME = 'items';

/**
 * Retrieve all items for a given telegramUserId from Firestore.
 * Sorted newest first.
 */
export async function getUserItemsFirestore(telegramUserId: string): Promise<SavedItem[]> {
  const db = getFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('telegramUserId', '==', String(telegramUserId))
    .get();

  const items: SavedItem[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as SavedItem);
  });

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Checks for a duplicate URL for a given telegramUserId in Firestore.
 */
export async function findUserDuplicateFirestore(
  telegramUserId: string,
  url: string
): Promise<SavedItem | undefined> {
  const db = getFirestore();
  if (!db || !url || !telegramUserId) return undefined;

  const normalizedTarget = normalizeUrlForComparison(url);
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('telegramUserId', '==', String(telegramUserId))
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as SavedItem;
    if (data.url && normalizeUrlForComparison(data.url) === normalizedTarget) {
      return data;
    }
  }

  return undefined;
}

/**
 * Save an item in Firestore with deduplication check per Telegram user.
 */
export async function saveUserItemFirestore(input: SaveItemInput): Promise<SaveItemResult> {
  const db = getFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const telegramUserId = String(input.telegramUserId || '').trim();

  // Deduplication check
  if (input.url && telegramUserId) {
    const existing = await findUserDuplicateFirestore(telegramUserId, input.url);
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

  await db.collection(COLLECTION_NAME).doc(newItem.id).set(newItem);

  return { item: newItem, isDuplicate: false };
}

/**
 * Update an existing item in Firestore (e.g. change category).
 */
export async function updateUserItemFirestore(
  id: string,
  updates: Partial<SavedItem>,
  telegramUserId?: string
): Promise<SavedItem | null> {
  const db = getFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = db.collection(COLLECTION_NAME).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const current = doc.data() as SavedItem;
  if (telegramUserId && String(current.telegramUserId || '') !== String(telegramUserId)) {
    return null; // Unauthorized to update another user's item
  }

  const updated: SavedItem = {
    ...current,
    ...updates,
    id: current.id,
    telegramUserId: current.telegramUserId,
  };

  await docRef.set(updated, { merge: true });
  return updated;
}

/**
 * Delete an item from Firestore.
 */
export async function deleteUserItemFirestore(
  id: string,
  telegramUserId?: string
): Promise<boolean> {
  const db = getFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const docRef = db.collection(COLLECTION_NAME).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const current = doc.data() as SavedItem;
  if (telegramUserId && String(current.telegramUserId || '') !== String(telegramUserId)) {
    return false; // Unauthorized
  }

  await docRef.delete();
  return true;
}
