-- Migration: Clinical Enhancements
-- Add predefined_procedures to dental_services
-- Add xray_images to treatments for multi-image support

ALTER TABLE public.dental_services ADD COLUMN IF NOT EXISTS predefined_procedures jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS xray_images jsonb DEFAULT '[]'::jsonb;

-- Migrate existing xray data to the new jsonb format if it hasn't been migrated
-- Note: This is a safe migration that only acts if xray_images is empty but xray_url is present.
UPDATE public.treatments 
SET xray_images = jsonb_build_array(
    jsonb_build_object(
        'url', xray_url,
        'type', xray_type,
        'notes', xray_notes
    )
)
WHERE (xray_url IS NOT NULL AND xray_url != '') 
  AND (xray_images IS NULL OR jsonb_array_length(xray_images) = 0);
