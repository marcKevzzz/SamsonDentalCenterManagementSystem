-- Migration: 20260430_CreateBlockedDates
-- Creates blocked_dates table for admin date blocking feature

CREATE TABLE public.blocked_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocked_dates_pkey PRIMARY KEY (id)
);

-- Index for fast date lookups on booking validation
CREATE INDEX idx_blocked_dates_date ON public.blocked_dates(blocked_date);
