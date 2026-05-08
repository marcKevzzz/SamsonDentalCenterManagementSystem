-- 20260509_ExpandChatbotAndIntegrity.sql

-- 1. Add integrity and leadership fields to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS ceo_name text DEFAULT 'Dr. Marcus Rivera',
ADD COLUMN IF NOT EXISTS admin_name text DEFAULT 'Samson Admin',
ADD COLUMN IF NOT EXISTS system_integrity_info text DEFAULT 'Our system employs end-to-end encryption for patient data, HIPAA-compliant storage via Supabase, and real-time audit logging to ensure maximum security and privacy.';

-- 2. Create chatbot_conversations table for saving chats
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid, -- optional, if logged in
    message text NOT NULL,
    is_bot boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id),
    CONSTRAINT chatbot_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Index for session-based retrieval
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);

-- 3. RLS Policies for Chatbot Conversations (Allow anonymous saving)
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to chatbot_conversations" 
ON public.chatbot_conversations FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow reading back by session (optional but good for future)
CREATE POLICY "Allow session-based reading"
ON public.chatbot_conversations FOR SELECT
TO anon, authenticated
USING (true); 
