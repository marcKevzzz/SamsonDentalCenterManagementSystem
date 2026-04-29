-- 20260429_UpdateActivityLogsSchema.sql
ALTER TABLE public.activity_logs 
ADD COLUMN category text,
ADD COLUMN link text;
