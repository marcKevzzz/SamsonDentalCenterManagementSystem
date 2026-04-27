-- Create unique index to prevent duplicate reviews
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_idx 
ON reviews (author_name, platform, md5(review_text));
