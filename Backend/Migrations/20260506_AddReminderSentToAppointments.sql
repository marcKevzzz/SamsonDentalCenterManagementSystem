-- Backend/Migrations/20260506_AddReminderSentToAppointments.sql
-- Add tracking for appointment reminders to prevent double sending

ALTER TABLE public.appointments 
ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;

-- Update schema source of truth
-- (I will update Blueprint/schema.sql in a separate step)
