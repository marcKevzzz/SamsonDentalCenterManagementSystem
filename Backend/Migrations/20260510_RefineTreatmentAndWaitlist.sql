-- Refine treatment table and enforce tooth status uniqueness
ALTER TABLE public.treatments 
ADD COLUMN IF NOT EXISTS tooth_data jsonb,
ADD COLUMN IF NOT EXISTS xray_url text,
ADD COLUMN IF NOT EXISTS xray_type text,
ADD COLUMN IF NOT EXISTS xray_notes text;

-- Ensure xray_data (legacy) is also available if needed, though we prefer specific columns
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS xray_data text;

-- Clean up duplicates before adding unique constraint to patient_tooth_status
-- We keep the most recently updated record for each tooth
DELETE FROM public.patient_tooth_status a 
USING public.patient_tooth_status b
WHERE a.id < b.id 
  AND a.patient_id = b.patient_id 
  AND a.tooth_number = b.tooth_number;

-- Add unique constraint to allow clean UPSERTS by patient_id + tooth_number
ALTER TABLE public.patient_tooth_status 
DROP CONSTRAINT IF EXISTS unique_patient_tooth;

ALTER TABLE public.patient_tooth_status 
ADD CONSTRAINT unique_patient_tooth UNIQUE (patient_id, tooth_number);
