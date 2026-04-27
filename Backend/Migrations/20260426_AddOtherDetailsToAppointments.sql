-- 20260426_AddOtherDetailsToAppointments.sql
ALTER TABLE public.appointments 
ADD COLUMN other_first_name text,
ADD COLUMN other_last_name text,
ADD COLUMN other_email text,
ADD COLUMN other_phone text;

-- Migrate existing data if any (optional, assuming other_name exists)
UPDATE public.appointments 
SET other_first_name = split_part(other_name, ' ', 1),
    other_last_name = substr(other_name, strpos(other_name, ' ') + 1)
WHERE other_name IS NOT NULL;

-- Remove old column
ALTER TABLE public.appointments DROP COLUMN IF EXISTS other_name;
