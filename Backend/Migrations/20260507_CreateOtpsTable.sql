-- Migration: 20260507_CreateOtpsTable.sql
-- Description: Create a table to manage One-Time Passwords for verification flows

CREATE TABLE public.otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  type text NOT NULL, -- 'signup', 'appointment', 'password_reset', 'invitation'
  expires_at timestamp with time zone NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT otps_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_otps_email_code ON public.otps(email, code);
