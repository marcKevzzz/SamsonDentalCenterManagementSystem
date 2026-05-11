-- Migration: Fix Schema, Roles, and RLS (Senior Recovery - V2)
-- Date: 2026-05-12

-- 1. Ensure app_role type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'receptionist', 'patient');
    END IF;
END $$;

-- 2. Drop policies that depend on profiles.role before altering the column type
-- This is required because Postgres blocks type changes on columns used in policy definitions.
DROP POLICY IF EXISTS "Staff can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can do everything" ON public.reviews;
DROP POLICY IF EXISTS "Admin Update" ON public.clinic_settings;
DROP POLICY IF EXISTS "Allow admins/staff to view all patient records" ON public.patients;
DROP POLICY IF EXISTS "Staff can view all patients" ON public.patients; -- Alternative name from ACID migration

-- 3. Ensure profiles table role column uses the enum
-- First, temporarily change to text to allow casting if needed
ALTER TABLE public.profiles ALTER COLUMN role TYPE text;
-- Then change back to the enum with explicit cast
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'patient'::public.app_role;
ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 4. Recreate dropped policies with the correct enum type casts
CREATE POLICY "Staff can manage all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('admin'::public.app_role, 'doctor'::public.app_role, 'receptionist'::public.app_role)
        )
    );

CREATE POLICY "Admins can do everything" ON public.reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'::public.app_role
        )
    );

CREATE POLICY "Admin Update" ON public.clinic_settings
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'::public.app_role
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'::public.app_role
        )
    );

CREATE POLICY "Staff can view all patients" ON public.patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) 
            AND role IN ('admin'::public.app_role, 'doctor'::public.app_role, 'receptionist'::public.app_role)
        )
    );

-- 5. Fix Patient Medical Info RLS
ALTER TABLE public.patient_medical_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own medical info" ON public.patient_medical_info;
CREATE POLICY "Users can view their own medical info" ON public.patient_medical_info
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Staff can manage all medical info" ON public.patient_medical_info;
CREATE POLICY "Staff can manage all medical info" ON public.patient_medical_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('admin'::public.app_role, 'doctor'::public.app_role, 'receptionist'::public.app_role)
        )
    );

-- 6. Fix Patient Tooth Status RLS
ALTER TABLE public.patient_tooth_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tooth chart" ON public.patient_tooth_status;
CREATE POLICY "Users can view their own tooth chart" ON public.patient_tooth_status
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Staff can manage all tooth charts" ON public.patient_tooth_status;
CREATE POLICY "Staff can manage all tooth charts" ON public.patient_tooth_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('admin'::public.app_role, 'doctor'::public.app_role, 'receptionist'::public.app_role)
        )
    );

-- 7. Ensure Invoices can be viewed by patients
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view their own invoices" ON public.invoices;
CREATE POLICY "Patients can view their own invoices" ON public.invoices
    FOR SELECT USING (patient_id = (SELECT auth.uid()));

-- 8. Ensure Treatments can be viewed by patients (via invoice)
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view their own treatments" ON public.treatments;
CREATE POLICY "Patients can view their own treatments" ON public.treatments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND i.patient_id = (SELECT auth.uid())
        )
    );
