-- Migration: Convert price from text to numeric
-- Created At: 2026-04-23
-- Description: Changes dental_services.price from text to numeric, removing '₱' and commas.

-- 1. Alter dental_services table
ALTER TABLE public.dental_services 
ALTER COLUMN price TYPE numeric USING (replace(replace(price, '₱', ''), ',', '')::numeric);

-- 2. (Context) invoices and invoice_items are already numeric/decimal in the app, 
-- ensure they exist in the DB if not already.
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id uuid,
  doctor_id uuid,
  total_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT invoices_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  service_id uuid,
  description text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id)
);
