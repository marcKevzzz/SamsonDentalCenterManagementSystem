-- Add logo_url to clinic_settings
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
