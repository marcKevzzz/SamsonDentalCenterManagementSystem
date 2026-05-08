-- Migration: Remove Oral Health fields from Profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS oral_health_score,
DROP COLUMN IF EXISTS oral_health_summary;
