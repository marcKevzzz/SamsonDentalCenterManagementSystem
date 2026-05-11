-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  action text NOT NULL,
  details text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  category text,
  link text,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  service_id uuid NOT NULL,
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
  source text NOT NULL DEFAULT 'online'::text,
  reminder_sent boolean NOT NULL DEFAULT false,
  soft_lock_until timestamp with time zone,
  booker_id uuid NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT appointments_booker_id_fkey FOREIGN KEY (booker_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.blocked_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocked_dates_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_dates_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.chatbot_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid,
  message text NOT NULL,
  is_bot boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL DEFAULT 'Samson Dental Center'::text,
  about_text text,
  location_address text,
  contact_email text,
  contact_phone text,
  clinical_hours jsonb DEFAULT '[]'::jsonb,
  is_automated_status boolean DEFAULT true,
  manual_status text DEFAULT 'open'::text,
  faqs jsonb DEFAULT '[]'::jsonb,
  clinic_photos jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  maps_url text,
  landline text,
  facebook_url text,
  instagram_url text,
  logo_url text,
  is_chatbot_enabled boolean DEFAULT true,
  chatbot_name text DEFAULT 'SDC Assistant'::text,
  chatbot_welcome_message text DEFAULT 'Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI''m your virtual assistant — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?'::text,
  ceo_name text DEFAULT 'Dr. Marcus Rivera'::text,
  admin_name text DEFAULT 'Samson Admin'::text,
  system_integrity_info text DEFAULT 'Our system employs end-to-end encryption for patient data, HIPAA-compliant storage via Supabase, and real-time audit logging to ensure maximum security and privacy.'::text,
  CONSTRAINT clinic_settings_pkey PRIMARY KEY (id)
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
  duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 15,
  needs_xray boolean DEFAULT false,
  CONSTRAINT dental_services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Dr.'::text,
  specialties ARRAY NOT NULL DEFAULT '{}'::text[],
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  years_of_experience integer,
  created_at timestamp with time zone DEFAULT now(),
  profile_id uuid UNIQUE,
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  guest_email text,
  guest_first_name text,
  guest_last_name text,
  guest_phone text,
  is_read boolean NOT NULL DEFAULT false,
  is_from_staff boolean NOT NULL DEFAULT false,
  assigned_doctor_id uuid,
  sender_id uuid,
  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT inquiries_assigned_doctor_id_fkey FOREIGN KEY (assigned_doctor_id) REFERENCES public.profiles(id),
  CONSTRAINT inquiries_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.inquiry_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL,
  sender_id uuid,
  message text NOT NULL,
  is_from_staff boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  is_internal boolean NOT NULL DEFAULT false,
  CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id),
  CONSTRAINT inquiry_messages_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id),
  CONSTRAINT inquiry_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  service_id uuid,
  description text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price numeric NOT NULL DEFAULT 0,
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT invoices_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  type text NOT NULL DEFAULT 'info'::text,
  link text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  type text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT otps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.patient_medical_info (
  patient_id uuid NOT NULL,
  blood_type text,
  height numeric,
  weight numeric,
  is_smoker boolean DEFAULT false,
  allergies jsonb DEFAULT '[]'::jsonb,
  medications jsonb DEFAULT '[]'::jsonb,
  history jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_medical_info_pkey PRIMARY KEY (patient_id),
  CONSTRAINT patient_medical_info_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.patient_tooth_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  tooth_number integer NOT NULL,
  status text NOT NULL DEFAULT 'healthy'::text,
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_tooth_status_pkey PRIMARY KEY (id),
  CONSTRAINT patient_tooth_status_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.patients (
  profile_id uuid NOT NULL,
  emergency_contact text,
  relationship text,
  invite_code text UNIQUE,
  invite_expires_at timestamp with time zone,
  is_claimed boolean NOT NULL DEFAULT false,
  created_by_id uuid,
  date_of_birth date,
  sex text,
  address text,
  CONSTRAINT patients_pkey PRIMARY KEY (profile_id),
  CONSTRAINT patients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT patients_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0::numeric),
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'completed'::text,
  reference_number text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
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
  is_active boolean NOT NULL DEFAULT true,
  reactivation_requested boolean NOT NULL DEFAULT false,
  requires_merge_review boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.receptionists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  desk_location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  profile_id uuid UNIQUE,
  bio text,
  CONSTRAINT receptionists_pkey PRIMARY KEY (id),
  CONSTRAINT receptionists_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_avatar text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  platform text NOT NULL DEFAULT 'Manual'::text,
  platform_review_id text UNIQUE,
  external_link text,
  is_visible boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  review_date timestamp with time zone,
  patient_id uuid,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.staff_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  staff_type text NOT NULL CHECK (staff_type = ANY (ARRAY['doctor'::text, 'receptionist'::text])),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT staff_availability_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_leaves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  leave_type character varying NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status character varying DEFAULT 'pending'::character varying,
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT staff_leaves_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT staff_leaves_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.treatments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  service_id uuid,
  service_name text NOT NULL,
  tooth_numbers text,
  procedure_details text,
  diagnosis text,
  status text NOT NULL DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['completed'::text, 'in-progress'::text, 'planned'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  tooth_data jsonb,
  xray_url text,
  xray_type text,
  xray_notes text,
  xray_data text,
  CONSTRAINT treatments_pkey PRIMARY KEY (id),
  CONSTRAINT treatments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT treatments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id)
);

-- Performance Optimization Indexes
CREATE INDEX idx_treatments_invoice_id ON public.treatments(invoice_id);
CREATE INDEX idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX idx_appointments_patient_status ON public.appointments(patient_id, status);
CREATE INDEX idx_treatments_created_at ON public.treatments(created_at DESC);