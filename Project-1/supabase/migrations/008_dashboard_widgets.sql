-- 008_dashboard_widgets.sql: Custom Dashboard Visual Widgets and Layout Persistence
-- Run this in your Supabase project SQL Editor

-- 1. Create dashboard_widgets table
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_dashboard_widget_config_size CHECK (octet_length(config::text) <= 16384)
);

-- 2. Performance indexes for ordering and user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_pos 
  ON public.dashboard_widgets (user_id, position ASC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Authenticated users can only select, insert, update, delete their own widgets
DROP POLICY IF EXISTS "Users can manage own dashboard widgets" ON public.dashboard_widgets;
CREATE POLICY "Users can manage own dashboard widgets"
  ON public.dashboard_widgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
