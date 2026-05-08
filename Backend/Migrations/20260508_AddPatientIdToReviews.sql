-- Add patient_id column to reviews table to link reviews to profiles
ALTER TABLE public.reviews ADD COLUMN patient_id uuid REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX idx_reviews_patient_id ON public.reviews(patient_id);
