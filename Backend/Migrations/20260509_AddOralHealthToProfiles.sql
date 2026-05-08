-- Migration: Add Oral Health fields to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS oral_health_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS oral_health_summary jsonb DEFAULT '{}'::jsonb;
