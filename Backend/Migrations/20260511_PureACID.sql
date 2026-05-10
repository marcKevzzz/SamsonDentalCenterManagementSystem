-- Migration: Pure ACID Identity Refactor (Safe Version V4)
-- Date: 2026-05-11

-- 0. RELAX AUTH LINK (Fixes ERROR 23503)
-- We must remove the strict FK to auth.users to allow "Shadow Profiles" (guests without accounts)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 1. Move clinical/bio fields from Profiles to Patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS sex text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS address text;

-- Data Migration: Transfer existing profile data to patients table
INSERT INTO public.patients (profile_id, date_of_birth, sex, address, is_claimed)
SELECT id, date_of_birth, sex, address, true 
FROM public.profiles 
WHERE role = 'patient'::app_role
ON CONFLICT (profile_id) DO UPDATE SET
    date_of_birth = EXCLUDED.date_of_birth,
    sex = EXCLUDED.sex,
    address = EXCLUDED.address;

-- 2. Add booker_id
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booker_id uuid REFERENCES public.profiles(id);

-- 3. RESOLVE NULL PATIENT_IDs
DO $$
BEGIN
    -- Create profiles for unique guest identities
    INSERT INTO public.profiles (id, first_name, last_name, email, phone_number, role)
    SELECT 
        gen_random_uuid(), 
        src.patient_first_name, 
        src.patient_last_name, 
        src.patient_email, 
        src.patient_phone, 
        'patient'::app_role
    FROM (
        SELECT DISTINCT patient_first_name, patient_last_name, patient_email, patient_phone
        FROM public.appointments
        WHERE patient_id IS NULL
        AND patient_first_name IS NOT NULL
        AND (patient_email IS NOT NULL OR patient_phone IS NOT NULL)
    ) src
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE (p.email IS NOT NULL AND p.email = src.patient_email)
        OR (p.phone_number IS NOT NULL AND p.phone_number = src.patient_phone)
    );

    -- Link appointments to these profiles
    UPDATE public.appointments a
    SET patient_id = p.id,
        booker_id = p.id
    FROM public.profiles p
    WHERE a.patient_id IS NULL
    AND (
        (a.patient_email IS NOT NULL AND a.patient_email = p.email)
        OR (a.patient_phone IS NOT NULL AND a.patient_phone = p.phone_number)
    );
    
    -- Cleanup incomplete records
    DELETE FROM public.appointments WHERE patient_id IS NULL;
END $$;

-- 4. Enforce Constraints
ALTER TABLE public.appointments ALTER COLUMN patient_id SET NOT NULL;
UPDATE public.appointments SET booker_id = patient_id WHERE booker_id IS NULL;
ALTER TABLE public.appointments ALTER COLUMN booker_id SET NOT NULL;

-- 5. RLS & Security for Patients Table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view their own record" ON public.patients;
CREATE POLICY "Patients can view their own record" ON public.patients
    FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Staff can view all patients" ON public.patients;
CREATE POLICY "Staff can view all patients" ON public.patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin'::app_role, 'doctor'::app_role, 'receptionist'::app_role)
        )
    );

-- 6. Update Appointment RLS to include Booker
DROP POLICY IF EXISTS "Users can view appointments they booked" ON public.appointments;
CREATE POLICY "Users can view appointments they booked" ON public.appointments
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = booker_id);

-- 7. Clean up redundant columns
ALTER TABLE public.appointments 
DROP COLUMN IF EXISTS patient_email,
DROP COLUMN IF EXISTS patient_phone,
DROP COLUMN IF EXISTS patient_sex,
DROP COLUMN IF EXISTS patient_dob,
DROP COLUMN IF EXISTS is_guest,
DROP COLUMN IF EXISTS is_for_other,
DROP COLUMN IF EXISTS other_sex,
DROP COLUMN IF EXISTS other_dob,
DROP COLUMN IF EXISTS other_first_name,
DROP COLUMN IF EXISTS other_last_name,
DROP COLUMN IF EXISTS other_email,
DROP COLUMN IF EXISTS other_phone,
DROP COLUMN IF EXISTS patient_first_name,
DROP COLUMN IF EXISTS patient_last_name;
