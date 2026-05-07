-- Migration: Add assigned_doctor_id to inquiries table
-- Date: 2026-05-07

ALTER TABLE public.inquiries 
ADD COLUMN assigned_doctor_id uuid NULL;

ALTER TABLE public.inquiries 
ADD CONSTRAINT inquiries_assigned_doctor_id_fkey 
FOREIGN KEY (assigned_doctor_id) REFERENCES public.profiles(id);
