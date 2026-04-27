-- Migration: Add payments table
-- Date: 2026-04-27

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    amount numeric(12, 2) NOT NULL DEFAULT 0, -- Specific precision for currency
    payment_method text NOT NULL, -- e.g., 'Cash', 'Credit Card', 'Insurance'
    status text NOT NULL DEFAULT 'completed', -- Track payment state
    reference_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) 
        REFERENCES public.invoices(id) ON DELETE CASCADE,
    CONSTRAINT positive_payment CHECK (amount >= 0) -- Prevent accidental negative entries
);

-- Index for the invoice lookup
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);