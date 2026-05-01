-- Migration: 20260430_ReceptionistFieldsAndAppointmentSource
-- 1. Add bio and specialties to receptionists (match doctors pattern)
ALTER TABLE public.receptionists ADD COLUMN IF NOT EXISTS bio text;

-- 2. Create receptionist_availability (mirror doctor_availability)
CREATE TABLE IF NOT EXISTS public.receptionist_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  receptionist_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT receptionist_availability_pkey PRIMARY KEY (id),
  CONSTRAINT receptionist_availability_receptionist_id_fkey FOREIGN KEY (receptionist_id) REFERENCES public.receptionists(id)
);

-- 3. Add source column to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online';
-- Values: 'online' (patient logged in), 'guest' (guest booking), 'walk_in', 'admin', 'phone'
