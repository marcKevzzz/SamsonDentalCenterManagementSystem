-- Migration: Add Requires Merge Review Flag to Profiles
-- Date: 2026-04-30

ALTER TABLE public.profiles
ADD COLUMN requires_merge_review BOOLEAN DEFAULT FALSE;
