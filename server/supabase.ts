import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

interface ItemRow {
  id: string;
  telegram_user_id: string;
  url: string | null;
  normalized_url: string | null;
  title: string;
  source_kind: string;
  source_label: string;
  category: string;
  text_content: string | null;
  created_at: string;
}

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  return Boolean(url && url.trim() && key && key.trim());
}

/**
 * Initializes and returns the Supabase client with the Service Role key.
 * Used exclusively on the backend (Vercel Serverless / Node server).
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();

  if (!url || !serviceKey) {
    return null;
  }

  supabaseClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

function mapRowToSavedItem(row: ItemRow): SavedItem {
  return {
    id: row.id,
    telegramUserId: row.telegram_user_id,
    title: row.title,
    url: row.url || undefined,
    sourceKind: (row.source_kind as SourceKind) || 'article',
    sourceLabel: row.source_label || 'ссылка',
    category: (row.category as CategoryName) || 'Разное',
    textContent: row.text_content || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Retrieve all items for a given telegramUserId from Supabase PostgreSQL.
 * Sorted newest first.
 */
export async function getUserItemsSupabase(telegramUserId: string): Promise<SavedItem[]> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured');

  const { data, error } = await client
    .from('items')
    .select('*')
    .eq('telegram_user_id', String(telegramUserId))
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch items from Supabase: ${error.message}`);
  }

  return (data || []).map((r) => mapRowToSavedItem(r as ItemRow));
}

/**
 * Checks for a duplicate URL for a given telegramUserId in Supabase PostgreSQL.
 */
export async function findUserDuplicateSupabase(
  telegramUserId: string,
  url: string
): Promise<SavedItem | undefined> {
  const client = getSupabase();
  if (!client || !url || !telegramUserId) return undefined;

  const normalizedUrl = normalizeUrlForComparison(url);
  if (!normalizedUrl) return undefined;

  const { data, error } = await client
    .from('items')
    .select('*')
    .eq('telegram_user_id', String(telegramUserId))
    .eq('normalized_url', normalizedUrl)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Warning checking duplicate:', error.message);
    return undefined;
  }

  if (data) {
    return mapRowToSavedItem(data as ItemRow);
  }

  return undefined;
}

/**
 * Save an item in Supabase PostgreSQL with database-level deduplication.
 */
export async function saveUserItemSupabase(input: SaveItemInput): Promise<SaveItemResult> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured');

  const telegramUserId = String(input.telegramUserId || '').trim();
  const normalizedUrl = input.url ? normalizeUrlForComparison(input.url) : null;

  // 1. Check for existing duplicate first
  if (normalizedUrl && telegramUserId) {
    const existing = await findUserDuplicateSupabase(telegramUserId, input.url!);
    if (existing) {
      return { item: existing, isDuplicate: true };
    }
  }

  const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rowToInsert: Partial<ItemRow> = {
    id: newId,
    telegram_user_id: telegramUserId,
    url: input.url ? input.url.trim() : null,
    normalized_url: normalizedUrl || null,
    title: input.title.trim() || (input.url ? 'Ссылка' : 'Заметка'),
    source_kind: input.sourceKind || (input.url ? 'article' : 'note'),
    source_label: input.sourceLabel || (input.url ? 'ссылка' : 'заметка'),
    category: input.category || 'Разное',
    text_content: input.textContent || null,
    created_at: input.createdAt || new Date().toISOString(),
  };

  const { data, error } = await client
    .from('items')
    .insert(rowToInsert)
    .select()
    .single();

  if (error) {
    // Unique constraint violation (code 23505 in Postgres) - race condition handled
    if (error.code === '23505' && normalizedUrl) {
      const existing = await findUserDuplicateSupabase(telegramUserId, input.url!);
      if (existing) {
        return { item: existing, isDuplicate: true };
      }
    }
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return {
    item: mapRowToSavedItem(data as ItemRow),
    isDuplicate: false,
  };
}

/**
 * Update an existing item in Supabase.
 */
export async function updateUserItemSupabase(
  id: string,
  updates: Partial<SavedItem>,
  telegramUserId?: string
): Promise<SavedItem | null> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured');

  const updatePayload: Partial<ItemRow> = {};
  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.category !== undefined) updatePayload.category = updates.category;
  if (updates.textContent !== undefined) updatePayload.text_content = updates.textContent;
  if (updates.url !== undefined) {
    updatePayload.url = updates.url;
    updatePayload.normalized_url = updates.url ? normalizeUrlForComparison(updates.url) : null;
  }
  if (updates.sourceKind !== undefined) updatePayload.source_kind = updates.sourceKind;
  if (updates.sourceLabel !== undefined) updatePayload.source_label = updates.sourceLabel;

  let query = client.from('items').update(updatePayload).eq('id', id);
  if (telegramUserId) {
    query = query.eq('telegram_user_id', String(telegramUserId));
  }

  const { data, error } = await query.select().maybeSingle();
  if (error || !data) {
    return null;
  }

  return mapRowToSavedItem(data as ItemRow);
}

/**
 * Delete an item from Supabase.
 */
export async function deleteUserItemSupabase(
  id: string,
  telegramUserId?: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured');

  let query = client.from('items').delete().eq('id', id);
  if (telegramUserId) {
    query = query.eq('telegram_user_id', String(telegramUserId));
  }

  const { error } = await query;
  return !error;
}
