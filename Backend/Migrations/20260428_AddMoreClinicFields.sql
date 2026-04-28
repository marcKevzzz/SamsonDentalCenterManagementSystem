-- Add missing columns to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS maps_url TEXT,
ADD COLUMN IF NOT EXISTS landline TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT exists instagram_url TEXT;

-- Refresh schema cache if needed
NOTIFY pgrst, 'reload schema';
