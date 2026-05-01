-- Migration: 20260501_AddIsReadToInquiries
-- Description: Adds is_read boolean to inquiries table and updates status options documentation.

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Status notes: 'pending', 'replied', 'closed', 'resolved'
