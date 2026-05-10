-- Migration: Senior Refactor - ACID Patient Superclass & Soft Locks
-- Date: 2026-05-10

-- 1. Create Patients table (Child of Profiles)
CREATE TABLE IF NOT EXISTS public.patients (
    profile_id uuid NOT NULL,
    emergency_contact text,
    relationship text,
    invite_code text UNIQUE,
    invite_expires_at timestamp with time zone,
    is_claimed boolean NOT NULL DEFAULT false,
    created_by_id uuid,
    
    CONSTRAINT patients_pkey PRIMARY KEY (profile_id),
    CONSTRAINT patients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT patients_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id)
);

-- 2. Add Soft Lock support to Appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS soft_lock_until timestamp with time zone;

-- 3. Initial Data Migration (Move existing patient data if needed)
-- Note: Profiles already has dob, sex, phone. We keep them there as base attributes 
-- but we could move them if we wanted pure ACID. For now, we link them.
INSERT INTO public.patients (profile_id, is_claimed)
SELECT id, true FROM public.profiles WHERE role = 'patient'
ON CONFLICT (profile_id) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Allow users to view their own patient record" ON public.patients
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Allow admins/staff to view all patient records" ON public.patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'receptionist', 'doctor')
        )
    );
