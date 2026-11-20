-- Phase 11: Security Audit Logging and PostgreSQL Full-Text Search
-- Run this in your Supabase project SQL Editor

-- 1. Full-Text Search Vector for Bookmarks
-- Adds an auto-updated tsvector column indexed with GIN for high-speed full-text searching
ALTER TABLE IF EXISTS public.bookmarks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(domain, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_bookmarks_search_vector
  ON public.bookmarks USING GIN(search_vector);

-- 2. Audit Logs Table for Critical Security Operations
-- Tracks logins, password updates, bulk deletions, and export operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs
DROP POLICY IF EXISTS "Users can read own audit logs" ON public.audit_logs;
CREATE POLICY "Users can read own audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Users can only insert audit logs for their own user ID
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);
