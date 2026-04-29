-- 20260429_ActivityLogsAndNotifications.sql
CREATE TABLE public.activity_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    type text NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'danger'
    link text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
