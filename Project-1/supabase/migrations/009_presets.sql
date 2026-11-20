-- ============================================================================
-- 009_presets.sql: Universal Preset Engine Persistence (DRAFT - DO NOT AUTO-RUN)
-- ============================================================================
-- Purpose:
-- Provides optional remote account-scoped persistence for Markly Universal Presets,
-- allowing users to sync their Homepage, Visuals, Folder Tabs, and Box presets across devices.
--
-- Security Rules Adherence:
-- - All rows belong to an authenticated Supabase user (`user_id = auth.uid()`).
-- - Strict RLS enabled with SELECT, INSERT, UPDATE, DELETE limited to own user_id.
-- - JSONB configuration capped to 65,536 bytes to prevent storage abuse.
-- ============================================================================

-- 1. Create presets table
CREATE TABLE IF NOT EXISTS public.presets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 2,
  kind TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  source JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_preset_snapshot_size CHECK (octet_length(snapshot::text) <= 65536)
);

-- 2. Indexes for fast user-scoped and category lookups
CREATE INDEX IF NOT EXISTS idx_presets_user_kind 
  ON public.presets (user_id, kind);

CREATE INDEX IF NOT EXISTS idx_presets_user_category 
  ON public.presets (user_id, category);

CREATE INDEX IF NOT EXISTS idx_presets_user_created 
  ON public.presets (user_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Authenticated users can only read and manage their own presets
DROP POLICY IF EXISTS "Users can read own presets" ON public.presets;
CREATE POLICY "Users can read own presets"
  ON public.presets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presets" ON public.presets;
CREATE POLICY "Users can insert own presets"
  ON public.presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presets" ON public.presets;
CREATE POLICY "Users can update own presets"
  ON public.presets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presets" ON public.presets;
CREATE POLICY "Users can delete own presets"
  ON public.presets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ROLLBACK SCRIPT (In case of reversion):
-- ============================================================================
-- DROP POLICY IF EXISTS "Users can delete own presets" ON public.presets;
-- DROP POLICY IF EXISTS "Users can update own presets" ON public.presets;
-- DROP POLICY IF EXISTS "Users can insert own presets" ON public.presets;
-- DROP POLICY IF EXISTS "Users can read own presets" ON public.presets;
-- DROP TABLE IF EXISTS public.presets CASCADE;
