-- Create reviews table
CREATE TABLE public.reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    author_name text NOT NULL,
    author_avatar text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text NOT NULL,
    platform text NOT NULL DEFAULT 'Manual',
    platform_review_id text UNIQUE,
    external_link text,
    is_visible boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read visible reviews
CREATE POLICY "Anyone can read visible reviews" ON public.reviews
    FOR SELECT USING (is_visible = true);

-- Policy: Admins can do everything
CREATE POLICY "Admins can do everything" ON public.reviews
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
