-- Migration: 20260425_CreateTreatmentsTable
-- Created At: 2026-04-25
-- Description: Creates the treatments table for recording clinical treatment details per invoice.

CREATE TABLE IF NOT EXISTS public.treatments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  service_id uuid,
  service_name text NOT NULL,
  tooth_numbers text,
  procedure_details text,
  diagnosis text,
  status text NOT NULL DEFAULT 'completed' CHECK (status = ANY (ARRAY['completed'::text, 'in-progress'::text, 'planned'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT treatments_pkey PRIMARY KEY (id),
  CONSTRAINT treatments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
  CONSTRAINT treatments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id)
);

-- Index for fast lookups by invoice
CREATE INDEX IF NOT EXISTS idx_treatments_invoice_id ON public.treatments(invoice_id);
