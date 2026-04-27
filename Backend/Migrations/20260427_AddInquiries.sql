-- Migration: Add inquiries and inquiry_messages tables
-- Date: 2026-04-27

CREATE TABLE IF NOT EXISTS public.inquiries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'replied', 'closed'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT inquiries_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id), -- Who sent it
    message text NOT NULL,
    is_from_staff boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_id ON public.inquiry_messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_patient_id ON public.inquiries(patient_id);


-- Allow anyone (even guests) to INSERT an inquiry
CREATE POLICY "Enable insert for guests" ON public.inquiries
    FOR INSERT 
    WITH CHECK (true);

-- Allow anyone to INSERT a message into an inquiry
CREATE POLICY "Enable message insert for guests" ON public.inquiry_messages
    FOR INSERT
    WITH CHECK (true);

    ALTER TABLE public.inquiries 
  -- Allow null so guests can submit without a profile ID
  ALTER COLUMN patient_id DROP NOT NULL,
  -- Add guest contact info
  ADD COLUMN guest_email text,
  ADD COLUMN guest_first_name text,
  ADD COLUMN guest_last_name text,
  ADD COLUMN guest_phone text;
  ALTER TABLE public.inquiry_messages 
  ALTER COLUMN sender_id DROP NOT NULL;