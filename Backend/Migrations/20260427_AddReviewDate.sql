-- Add review_date column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_date timestamp with time zone;

-- Copy existing created_at to review_date for records that don't have it
UPDATE reviews SET review_date = created_at WHERE review_date IS NULL;
