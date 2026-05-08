-- 20260509_AddPerformanceIndexes.sql
-- Optimizes critical lookups for appointment availability and profile smart matching

-- 1. Appointment Availability Index
-- Combined index for faster filtering by doctor, date, and active status
CREATE INDEX IF NOT EXISTS idx_appointments_availability_search 
ON public.appointments (doctor_id, appointment_date, status) 
WHERE status IN ('confirmed', 'arrived');

-- 2. Profile Search Indexes
-- Optimizes SmartMatch and GetUserIdByEmail lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_search ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_search ON public.profiles (phone_number);

-- 3. Composite Name Index for Smart Matching
-- Speeds up First Name + Last Name lookups
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles (last_name, first_name);
