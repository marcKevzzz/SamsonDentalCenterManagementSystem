-- Migration: 20260511_FixAppointmentStatusConstraint.sql
-- Updates the appointments_status_check constraint to include 'waitlist'.

BEGIN;

-- 1. Identify the existing constraint name. In schema.sql it is 'appointments_status_check'.
-- 2. Drop the old constraint.
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- 3. Add the new constraint with 'waitlist' included.
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'arrived'::text, 'completed'::text, 'no_show'::text, 'cancelled'::text, 'waitlist'::text]));

COMMIT;
