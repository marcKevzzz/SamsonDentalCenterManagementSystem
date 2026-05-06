-- Backend/Migrations/20260505_AddInternalNoteToInquiries.sql
-- Add is_internal flag to inquiry_messages to allow staff-only notes.
-- Add is_from_staff flag to inquiries to identify staff-initiated threads.

ALTER TABLE public.inquiry_messages 
ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS is_from_staff boolean NOT NULL DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN public.inquiry_messages.is_internal IS 'If true, message is only visible to staff (internal note).';
COMMENT ON COLUMN public.inquiries.is_from_staff IS 'If true, the inquiry thread was started by a staff member.';

