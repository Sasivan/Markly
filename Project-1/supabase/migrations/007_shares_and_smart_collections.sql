-- 007_shares_and_smart_collections.sql: Support public folder shares, smart collections, and bookmark notes in Supabase Postgres
-- Run this in your Supabase project SQL Editor

-- 1. Ensure notes and cached_content columns exist on bookmarks
ALTER TABLE IF EXISTS public.bookmarks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS public.bookmarks ADD COLUMN IF NOT EXISTS cached_content TEXT;

-- 2. Create smart_collections table
CREATE TABLE IF NOT EXISTS public.smart_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  rules_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_collections_user ON public.smart_collections (user_id);
ALTER TABLE public.smart_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own smart collections" ON public.smart_collections;
CREATE POLICY "Users can manage own smart collections"
  ON public.smart_collections
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 3. Create shares table for public folder sharing
CREATE TABLE IF NOT EXISTS public.shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_token ON public.shares (share_token);
CREATE INDEX IF NOT EXISTS idx_shares_user_folder ON public.shares (user_id, folder_id);
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Owner can do everything on their shares
DROP POLICY IF EXISTS "Users can manage own shares" ON public.shares;
CREATE POLICY "Users can manage own shares"
  ON public.shares
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Public / Anonymous users can read active share metadata by token
DROP POLICY IF EXISTS "Public can view active shares by token" ON public.shares;
CREATE POLICY "Public can view active shares by token"
  ON public.shares
  FOR SELECT
  TO anon, authenticated
  USING (
    expires_at IS NULL OR expires_at > now()
  );

