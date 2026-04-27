-- Remove obsolete service_name column from appointments
-- Service name is now fetched via join with dental_services

ALTER TABLE public.appointments
DROP COLUMN IF EXISTS service_name;
