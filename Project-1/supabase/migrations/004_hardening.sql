-- Phase 12 Stage 4: Database Hardening
-- Run this migration in your Supabase project SQL Editor
-- 1. Hardens handle_new_user by setting an empty search_path to prevent search-path injection.
-- 2. Enforces FORCE ROW LEVEL SECURITY on all tenant tables (ensures policies apply to table owners too).
-- 3. Adds a database-level CHECK constraint rejecting reserved usernames.

-- 1. Hardened handle_new_user trigger function with SET search_path = ''
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_uname TEXT;
  cleaned_uname TEXT;
BEGIN
  raw_uname := pg_catalog.lower(pg_catalog.trim(pg_catalog.coalesce(NEW.raw_user_meta_data->>'username', pg_catalog.split_part(NEW.email, '@', 1), 'user')));
  -- Sanitize invalid characters
  cleaned_uname := pg_catalog.regexp_replace(raw_uname, '[^a-z0-9_.-]', '_', 'g');
  IF pg_catalog.length(cleaned_uname) < 3 THEN
    cleaned_uname := cleaned_uname || '_usr';
  END IF;
  IF pg_catalog.length(cleaned_uname) > 30 THEN
    cleaned_uname := pg_catalog.substring(cleaned_uname FROM 1 FOR 30);
  END IF;

  -- Ensure auto-generated usernames do not collide with reserved names
  IF cleaned_uname IN ('admin', 'root', 'markly', 'support', 'help', 'guest', 'system', 'anonymous') THEN
    cleaned_uname := pg_catalog.substring(cleaned_uname FROM 1 FOR 23) || '_' || pg_catalog.substring(NEW.id::text FROM 1 FOR 6);
  END IF;

  -- Handle collision gracefully
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = cleaned_uname AND id != NEW.id) THEN
    cleaned_uname := pg_catalog.substring(cleaned_uname FROM 1 FOR 23) || '_' || pg_catalog.substring(NEW.id::text FROM 1 FOR 6);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    cleaned_uname,
    pg_catalog.coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', cleaned_uname),
    pg_catalog.coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id),
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$;

-- 2. Force Row Level Security on all user data tables
-- Enforces RLS policies unconditionally, preventing bypass even by table owners.
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.folders FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookmarks FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tags FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookmark_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;

-- 3. CHECK constraint on profiles table rejecting reserved usernames
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_reserved_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT username_reserved_check CHECK (
    username NOT IN ('admin', 'root', 'markly', 'support', 'help', 'guest', 'system', 'anonymous')
  );
