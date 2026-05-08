-- 20260508_AddAppointmentIndexes.sql
-- Optimizes appointment queries for Admin, Patient Dashboard, and Reminder Service

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments USING btree (appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent ON public.appointments USING btree (reminder_sent);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments USING btree (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments USING btree (created_at DESC);
