-- Add is_active to profiles for deactivation support
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
