-- Phase 10 Stage 5: Row Level Security on all data tables
-- Run this in your Supabase project SQL Editor

-- 1. Enable RLS on folders
ALTER TABLE IF EXISTS public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own folders" ON public.folders;
CREATE POLICY "Users can manage own folders"
  ON public.folders
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 2. Enable RLS on bookmarks
ALTER TABLE IF EXISTS public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 3. Enable RLS on tags
ALTER TABLE IF EXISTS public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;
CREATE POLICY "Users can manage own tags"
  ON public.tags
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 4. Enable RLS on bookmark_tags
ALTER TABLE IF EXISTS public.bookmark_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmark_tags" ON public.bookmark_tags;
CREATE POLICY "Users can manage own bookmark_tags"
  ON public.bookmark_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookmarks b
      WHERE b.id = bookmark_tags.bookmark_id
      AND b.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookmarks b
      WHERE b.id = bookmark_tags.bookmark_id
      AND b.user_id = auth.uid()::text
    )
  );

