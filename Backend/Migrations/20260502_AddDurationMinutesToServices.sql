-- ── Migration: 20260502_AddDurationMinutesToServices.sql ─────────────────────
-- Adds integer duration_minutes to dental_services.
-- Populates based on appointment policy.
-- Retains the legacy `duration` text column for display (taglines, etc.)

-- 1. Add the new numeric column
ALTER TABLE dental_services
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;

-- 2. Populate based on service slug (policy-defined durations)
UPDATE dental_services SET duration_minutes = 45  WHERE slug = 'general-dentistry';
UPDATE dental_services SET duration_minutes = 60  WHERE slug = 'teeth-cleaning';
UPDATE dental_services SET duration_minutes = 60  WHERE slug = 'tooth-extraction';
UPDATE dental_services SET duration_minutes = 45  WHERE slug = 'dental-fillings';
UPDATE dental_services SET duration_minutes = 90  WHERE slug = 'teeth-whitening';
UPDATE dental_services SET duration_minutes = 60  WHERE slug = 'braces';
UPDATE dental_services SET duration_minutes = 90  WHERE slug = 'root-canal';
UPDATE dental_services SET duration_minutes = 60  WHERE slug = 'veneers';

-- 3. Also update the legacy text `duration` column to a clean format
UPDATE dental_services SET duration = '45 min'  WHERE slug = 'general-dentistry';
UPDATE dental_services SET duration = '60 min'  WHERE slug = 'teeth-cleaning';
UPDATE dental_services SET duration = '60 min'  WHERE slug = 'tooth-extraction';
UPDATE dental_services SET duration = '45 min'  WHERE slug = 'dental-fillings';
UPDATE dental_services SET duration = '90 min'  WHERE slug = 'teeth-whitening';
UPDATE dental_services SET duration = '60 min'  WHERE slug = 'braces';
UPDATE dental_services SET duration = '90 min'  WHERE slug = 'root-canal';
UPDATE dental_services SET duration = '60 min'  WHERE slug = 'veneers';
