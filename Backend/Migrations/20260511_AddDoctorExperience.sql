-- Backend/Migrations/20260511_AddDoctorExperience.sql
ALTER TABLE public.doctors ADD COLUMN years_of_experience integer;
