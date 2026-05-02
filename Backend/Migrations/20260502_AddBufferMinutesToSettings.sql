-- ── Migration: 20260502_AddBufferMinutesToSettings.sql ─────────────────────
-- Adds buffer_minutes to clinic_settings to allow configurable time between appointments.

ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 15;
