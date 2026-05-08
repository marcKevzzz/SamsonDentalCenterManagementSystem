-- Migration: Database Security and Performance Fixes
-- Date: 2026-05-08

-- 1. Function Search Path Security (0011_function_search_path_mutable)
-- Fixes role-mutable search_path warnings by pinning to 'public'
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.set_service_icon() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_distinct_service_categories() SET search_path = public;
ALTER FUNCTION public.handle_expired_appointments() SET search_path = public;

-- 2. Function Execution Hardening (0028_anon_security_definer_function_executable)
-- Prevents public execution of internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- 3. RLS Performance Optimization (0003_auth_rls_initplan)
-- Wraps auth.uid() and other calls in (SELECT ...) to prevent row-by-row re-evaluation

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = (SELECT auth.uid()));

-- Appointments
DROP POLICY IF EXISTS "Patients view own" ON public.appointments;
CREATE POLICY "Patients view own" ON public.appointments
    FOR SELECT USING (patient_id = (SELECT auth.uid()));

-- Receptionists
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.receptionists;
CREATE POLICY "Enable all access for authenticated users" ON public.receptionists
    FOR ALL USING ((SELECT auth.role()) = 'authenticated');

-- Payments
DROP POLICY IF EXISTS "Staff can manage all payments" ON public.payments;
CREATE POLICY "Staff can manage all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'doctor', 'receptionist')
        )
    );

DROP POLICY IF EXISTS "Patients can view own payments" ON public.payments;
CREATE POLICY "Patients can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND i.patient_id = (SELECT auth.uid())
        )
    );

-- Reviews
DROP POLICY IF EXISTS "Admins can do everything" ON public.reviews;
CREATE POLICY "Admins can do everything" ON public.reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- 4. Hardening Permissive Policies (0024_permissive_rls_policy)

-- Clinic Settings: Ensure only Admins can update
DROP POLICY IF EXISTS "Admin Update" ON public.clinic_settings;
CREATE POLICY "Admin Update" ON public.clinic_settings
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Appointments: Restrict Service Role policy to service_role only
DROP POLICY IF EXISTS "Service role appointments" ON public.appointments;
CREATE POLICY "Service role appointments" ON public.appointments
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Dental Services: Restrict Service Role policy to service_role only
DROP POLICY IF EXISTS "Service role full access" ON public.dental_services;
CREATE POLICY "Service role full access" ON public.dental_services
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Inquiries: Tighten guest access to specific roles
DROP POLICY IF EXISTS "Enable insert for guests" ON public.inquiries;
CREATE POLICY "Enable insert for guests" ON public.inquiries
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable message insert for guests" ON public.inquiry_messages;
CREATE POLICY "Enable message insert for guests" ON public.inquiry_messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- 5. Storage Security (0025_public_bucket_allows_listing)
-- Drop broad SELECT policies that allow listing files in the public bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 6. Performance Indexes
-- Suggested by Index Advisor for frequently queried and ordered columns
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_created_at ON public.staff_leaves USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_type ON public.staff_availability USING btree (staff_type);
