-- Fix corrupted JSON data in clinic_settings
UPDATE public.clinic_settings 
SET 
  clinical_hours = '[]'::jsonb,
  faqs = '[]'::jsonb,
  clinic_photos = '[]'::jsonb
WHERE 
  clinical_hours->>'ValueKind' IS NOT NULL 
  OR faqs->>'ValueKind' IS NOT NULL 
  OR clinic_photos->>'ValueKind' IS NOT NULL;
