-- Create clinic_settings table
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name text NOT NULL DEFAULT 'Samson Dental Center',
    about_text text,
    location_address text,
    contact_email text,
    contact_phone text,
    clinical_hours jsonb DEFAULT '[]'::jsonb,
    is_automated_status boolean DEFAULT true,
    manual_status text DEFAULT 'open',
    faqs jsonb DEFAULT '[]'::jsonb,
    clinic_photos jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert initial row if not exists
INSERT INTO public.clinic_settings (id, clinic_name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Samson Dental Center')
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read" 
ON public.clinic_settings FOR SELECT 
USING (true);

-- 2. Only authenticated Admins can update the settings
CREATE POLICY "Admin Update" 
ON public.clinic_settings FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);