-- Migration: 20260430_MergeStaffAvailability.sql
-- Merges doctor_availability + receptionist_availability into staff_availability.
-- staff_id = UUID of either the doctor or receptionist record.
-- staff_type = 'doctor' | 'receptionist'

BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_availability (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    staff_id      uuid NOT NULL,
    staff_type    text NOT NULL CHECK (staff_type IN ('doctor', 'receptionist')),
    day_of_week   integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time    text NOT NULL,
    end_time      text NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    CONSTRAINT staff_availability_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_avail_staff ON public.staff_availability (staff_id, staff_type);

-- Migrate existing doctor availability
INSERT INTO public.staff_availability (id, staff_id, staff_type, day_of_week, start_time, end_time, is_active)
SELECT id, doctor_id, 'doctor', day_of_week, start_time, end_time, is_active
FROM public.doctor_availability;

-- Migrate existing receptionist availability
INSERT INTO public.staff_availability (id, staff_id, staff_type, day_of_week, start_time, end_time, is_active)
SELECT id, receptionist_id, 'receptionist', day_of_week, start_time, end_time, is_active
FROM public.receptionist_availability;

-- Drop old tables
DROP TABLE IF EXISTS public.doctor_availability;
DROP TABLE IF EXISTS public.receptionist_availability;

COMMIT;
