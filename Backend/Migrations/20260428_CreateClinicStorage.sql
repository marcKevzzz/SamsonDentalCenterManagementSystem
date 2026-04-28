-- 1. Create storage bucket for clinic photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clinic-photos', 'clinic-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Allow public to read photos
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'clinic-photos');

-- Allow authenticated Admins to upload/delete
CREATE POLICY "Admin All Access" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'clinic-photos')
WITH CHECK (bucket_id = 'clinic-photos');
