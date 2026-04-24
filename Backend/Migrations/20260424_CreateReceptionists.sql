CREATE TABLE IF NOT EXISTS public.receptionists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  desk_location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  profile_id uuid UNIQUE,
  CONSTRAINT receptionists_pkey PRIMARY KEY (id),
  CONSTRAINT receptionists_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

-- Give access to anon and authenticated users
ALTER TABLE public.receptionists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.receptionists FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.receptionists FOR ALL USING (auth.role() = 'authenticated');
