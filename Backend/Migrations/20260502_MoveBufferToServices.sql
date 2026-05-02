-- ── Migration: 20260502_MoveBufferToServices.sql ──────────────────────────
-- Removes buffer_minutes from clinic_settings and adds it to dental_services and appointments.

ALTER TABLE clinic_settings DROP COLUMN IF EXISTS buffer_minutes;

ALTER TABLE dental_services
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 15;

-- Update existing services and appointments with 15 mins buffer
UPDATE dental_services SET buffer_minutes = 15;
