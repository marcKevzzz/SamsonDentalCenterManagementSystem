-- Add reactivation_requested to profiles
ALTER TABLE public.profiles ADD COLUMN reactivation_requested boolean NOT NULL DEFAULT false;
