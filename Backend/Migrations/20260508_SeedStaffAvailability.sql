-- Migration: 20260508_SeedStaffAvailability.sql
-- Seeds the staff_availability table with the provided schedules for doctors.

BEGIN;

INSERT INTO public.staff_availability (id, staff_id, staff_type, day_of_week, start_time, end_time, is_active)
VALUES
    ('05c5c9cf-759a-4e9c-acd0-092804ab75e2', '1bdf6368-255f-4836-98f4-60a782eba40d', 'doctor', 1, '09:00', '17:00', true),
    ('4d09b63d-59f7-434f-bf48-50f204524830', '71e36144-4cf0-4ec8-9344-c9c2255a8451', 'doctor', 1, '09:00', '17:00', true),
    ('3a46ba4e-ab40-4681-977a-d3eac901647c', 'dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80', 'doctor', 1, '09:00', '17:00', true),
    ('ac54561b-6fdd-458f-9d29-4d0ddadfe737', '1bdf6368-255f-4836-98f4-60a782eba40d', 'doctor', 2, '09:00', '17:00', true),
    ('f5e9754b-d77c-4731-92f7-e435930e439b', '71e36144-4cf0-4ec8-9344-c9c2255a8451', 'doctor', 2, '09:00', '17:00', true),
    ('09d7843d-7521-4f9e-8c54-4a6f2945d82c', 'dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80', 'doctor', 2, '09:00', '17:00', true),
    ('b5c46e3d-7123-4e4b-9c34-d92a1b456e72', '1bdf6368-255f-4836-98f4-60a782eba40d', 'doctor', 3, '09:00', '17:00', true),
    ('c92a345b-d345-4b56-8e12-4c56e345d23a', '71e36144-4cf0-4ec8-9344-c9c2255a8451', 'doctor', 3, '09:00', '17:00', true),
    ('d123e45b-6789-4a12-9c34-f2a34e56b12c', 'dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80', 'doctor', 3, '09:00', '17:00', true)
ON CONFLICT (id) DO UPDATE SET
    staff_id = EXCLUDED.staff_id,
    staff_type = EXCLUDED.staff_type,
    day_of_week = EXCLUDED.day_of_week,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_active = EXCLUDED.is_active;

COMMIT;
