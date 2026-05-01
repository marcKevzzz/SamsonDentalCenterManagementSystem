-- Migration: Add Patient Medical Info table
CREATE TABLE public.patient_medical_info (
  patient_id uuid NOT NULL PRIMARY KEY,
  blood_type text,
  height numeric,
  weight numeric,
  is_smoker boolean DEFAULT false,
  allergies jsonb DEFAULT '[]'::jsonb,
  medications jsonb DEFAULT '[]'::jsonb,
  history jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_medical_info_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
);

-- Tooth status tracking (optional, can be derived from treatments, but better for quick lookup)
CREATE TABLE public.patient_tooth_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  tooth_number integer NOT NULL,
  status text NOT NULL DEFAULT 'healthy', -- healthy, filled, crown, rct, extracted, missing
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_tooth_status_pkey PRIMARY KEY (id),
  CONSTRAINT patient_tooth_status_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  UNIQUE(patient_id, tooth_number)
);
