-- ============================================================
-- Add 'entries' JSONB column to public.results table
-- Run this in the Supabase Dashboard -> SQL Editor to allow
-- storing result records for ALL candidates (1 to N).
-- ============================================================

ALTER TABLE public.results ADD COLUMN IF NOT EXISTS entries jsonb DEFAULT '[]'::jsonb;

-- Update RLS policy to ensure authenticated users/judges can manage results
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
