-- FINAL PATIENT PORTAL OPTIMIZATION
-- Ensures critical indexes for treatment retrieval and dashboard performance

-- Index for retrieving treatments by invoice
CREATE INDEX IF NOT EXISTS idx_treatments_invoice_id ON public.treatments(invoice_id);

-- Index for retrieving invoices by patient
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);

-- Index for retrieving appointments by patient + status (for dashboard counts)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON public.appointments(patient_id, status);

-- Index for record sorting
CREATE INDEX IF NOT EXISTS idx_treatments_created_at ON public.treatments(created_at DESC);
