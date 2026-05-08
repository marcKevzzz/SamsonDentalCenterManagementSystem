-- Add sender_id to inquiries to track who initiated the conversation
-- This enables a "Chatting System" model where only participants see the thread.

ALTER TABLE public.inquiries ADD COLUMN sender_id uuid REFERENCES public.profiles(id);

-- Backfill sender_id from the first message of each inquiry
UPDATE public.inquiries i
SET sender_id = (
    SELECT sender_id 
    FROM public.inquiry_messages m 
    WHERE m.inquiry_id = i.id 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE sender_id IS NULL;
