-- ============================================================================
-- SnapKeep Database Schema for Supabase PostgreSQL
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  url TEXT,
  normalized_url TEXT,
  title TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT 'article',
  source_label TEXT NOT NULL DEFAULT 'ссылка',
  category TEXT NOT NULL DEFAULT 'Разное',
  text_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  preview_title TEXT,
  preview_description TEXT,
  preview_image_url TEXT,
  preview_domain TEXT,
  preview_status TEXT NOT NULL DEFAULT 'pending'
);

-- 2. Index for fast querying user items ordered by newest first
CREATE INDEX IF NOT EXISTS idx_items_user_created_at
ON public.items (telegram_user_id, created_at DESC);

-- 3. Unique partial index for reliable URL deduplication per Telegram user
-- Guarantees that concurrent requests or multiple clicks cannot create duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_user_normalized_url
ON public.items (telegram_user_id, normalized_url)
WHERE normalized_url IS NOT NULL;

-- 4. Enable Row Level Security (RLS) for data protection
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- The backend uses SUPABASE_SERVICE_ROLE_KEY which automatically bypasses RLS.
-- We do NOT allow public anonymous access directly from browsers.
-- This keeps all data safe and routed exclusively through your Vercel backend.
DROP POLICY IF EXISTS "Backend service role full access" ON public.items;
CREATE POLICY "Backend service role full access"
ON public.items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
