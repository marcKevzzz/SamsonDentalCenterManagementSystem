-- Migration: 20260504_SplitAppointmentPatientName.sql

-- 1. Add new columns
ALTER TABLE public.appointments 
ADD COLUMN patient_first_name text,
ADD COLUMN patient_last_name text;

-- 2. Migrate data
-- Best effort split by space: 
-- first_name is everything before the first space
-- last_name is everything after the first space
UPDATE public.appointments 
SET 
  patient_first_name = split_part(patient_name, ' ', 1),
  patient_last_name = CASE 
    WHEN position(' ' in patient_name) > 0 THEN substring(patient_name from position(' ' in patient_name) + 1)
    ELSE ''
  END;

-- 3. Set NOT NULL constraint after data migration
ALTER TABLE public.appointments 
ALTER COLUMN patient_first_name SET NOT NULL,
ALTER COLUMN patient_last_name SET NOT NULL;

-- 4. Drop old column
ALTER TABLE public.appointments 
DROP COLUMN patient_name;
