-- Phase 10 Stage 3: Profiles Table, Trigger, RLS & Backfill
-- Run this in your Supabase project SQL Editor

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format_check CHECK (
    username = lower(username) AND
    username ~ '^[a-z0-9_.-]{3,30}$'
  )
);

-- Index for fast username lookups on login
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Authenticated users can view only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Authenticated users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. Automatic Profile Creation Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_uname TEXT;
  cleaned_uname TEXT;
BEGIN
  raw_uname := lower(trim(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user')));
  -- Clean invalid characters
  cleaned_uname := regexp_replace(raw_uname, '[^a-z0-9_.-]', '_', 'g');
  IF length(cleaned_uname) < 3 THEN
    cleaned_uname := cleaned_uname || '_usr';
  END IF;
  IF length(cleaned_uname) > 30 THEN
    cleaned_uname := substring(cleaned_uname FROM 1 FOR 30);
  END IF;

  -- Handle collision gracefully
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = cleaned_uname AND id != NEW.id) THEN
    cleaned_uname := substring(cleaned_uname FROM 1 FOR 23) || '_' || substring(NEW.id::text FROM 1 FOR 6);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    cleaned_uname,
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', cleaned_uname),
    coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Safe Backfill from existing auth.users
DO $$
DECLARE
  u RECORD;
  raw_uname TEXT;
  cleaned_uname TEXT;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data, created_at FROM auth.users LOOP
    raw_uname := lower(trim(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user')));
    cleaned_uname := regexp_replace(raw_uname, '[^a-z0-9_.-]', '_', 'g');
    IF length(cleaned_uname) < 3 THEN
      cleaned_uname := cleaned_uname || '_usr';
    END IF;
    IF length(cleaned_uname) > 30 THEN
      cleaned_uname := substring(cleaned_uname FROM 1 FOR 30);
    END IF;

    -- Avoid collisions across existing users
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = cleaned_uname AND id != u.id) THEN
      cleaned_uname := substring(cleaned_uname FROM 1 FOR 23) || '_' || substring(u.id::text FROM 1 FOR 6);
    END IF;

    INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
    VALUES (
      u.id,
      cleaned_uname,
      coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', cleaned_uname),
      coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || u.id),
      coalesce(u.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

