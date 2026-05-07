-- Add needs_xray column to dental_services
ALTER TABLE dental_services ADD COLUMN needs_xray BOOLEAN DEFAULT FALSE;
