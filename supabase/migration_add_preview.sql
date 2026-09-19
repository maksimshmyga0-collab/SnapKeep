-- ============================================================================
-- SnapKeep Database Migration: Add Visual Preview Metadata to public.items
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Add new nullable preview columns safely without dropping or locking data
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS preview_title TEXT,
  ADD COLUMN IF NOT EXISTS preview_description TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS preview_domain TEXT,
  ADD COLUMN IF NOT EXISTS preview_status TEXT NOT NULL DEFAULT 'pending';

-- 2. Set preview_status for existing historical items without metadata:
-- Existing items created before this feature default to 'failed' (clean fallback)
-- so they do not hang indefinitely in a pending loading state.
UPDATE public.items
SET preview_status = 'failed'
WHERE preview_status = 'pending'
  AND (preview_title IS NULL AND preview_image_url IS NULL);
