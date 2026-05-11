-- Migration: 20260511_UpdateDoctorSpecialties.sql
-- Adds 'Cosmetic' specialty to Dr. Marc Kevin to enable Saturday bookings for Cosmetic services.

BEGIN;

UPDATE public.doctors
SET specialties = array_append(specialties, 'Cosmetic')
WHERE id = '71e36144-4cf0-4ec8-9344-c9c2255a8451'
  AND NOT ('Cosmetic' = ANY(specialties));

COMMIT;
