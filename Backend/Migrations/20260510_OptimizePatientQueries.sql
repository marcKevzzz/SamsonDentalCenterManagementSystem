    -- 20260510_OptimizePatientQueries.sql
    -- Add indexes for frequently queried foreign keys in the patient portal

    -- Appointments lookups
    CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);

    -- Invoice lookups
    CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON public.invoices(appointment_id);

    -- Treatment lookups
    CREATE INDEX IF NOT EXISTS idx_treatments_invoice_id ON public.treatments(invoice_id);

    -- Notification lookups
    CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);

    -- Patient medical info & tooth status
    -- patient_medical_info has patient_id as PK, so index already exists
    CREATE INDEX IF NOT EXISTS idx_patient_tooth_status_patient_id ON public.patient_tooth_status(patient_id);

    -- Optimize review lookups
    CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON public.reviews(patient_id);

    -- Date-based ordering indexes
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
    CREATE INDEX IF NOT EXISTS idx_treatments_created_at ON public.treatments(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
