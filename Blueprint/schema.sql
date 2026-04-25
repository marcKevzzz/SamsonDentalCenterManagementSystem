-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  patient_name text NOT NULL,
  patient_email text NOT NULL,
  patient_phone text NOT NULL,
  patient_sex text,
  patient_dob date,
  is_guest boolean NOT NULL DEFAULT false,
  is_for_other boolean NOT NULL DEFAULT false,
  other_name text,
  other_sex text,
  other_dob date,
  service_id uuid NOT NULL,
  service_name text NOT NULL,
  doctor_id uuid,
  appointment_date date NOT NULL,
  appointment_time text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'arrived'::text, 'completed'::text, 'no_show'::text, 'cancelled'::text])),
  is_waitlist boolean NOT NULL DEFAULT false,
  waitlist_position integer,
  confirmation_token text UNIQUE,
  confirmed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email_status text DEFAULT 'Pending'::text,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.dental_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category = ANY (ARRAY['General Dentistry'::text, 'Cosmetic'::text, 'Specialized'::text])),
  name text NOT NULL,
  tagline text NOT NULL,
  hero text NOT NULL DEFAULT ''::text,
  icon text,
  summary text,
  duration text,
  recovery text,
  price numeric NOT NULL,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dental_services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doctor_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT doctor_availability_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_availability_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Dr.'::text,
  specialties ARRAY NOT NULL DEFAULT '{}'::text[],
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  profile_id uuid UNIQUE,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.receptionists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  desk_location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  profile_id uuid UNIQUE,
  CONSTRAINT receptionists_pkey PRIMARY KEY (id),
  CONSTRAINT receptionists_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  sex text,
  phone_number text,
  address text,
  role USER-DEFINED NOT NULL DEFAULT 'patient'::app_role,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.invoices (
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

CREATE TABLE public.invoice_items (
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

CREATE TABLE public.treatments (
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