-- Add Chatbot settings to clinic_settings
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS is_chatbot_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS chatbot_name TEXT DEFAULT 'SDC Assistant',
ADD COLUMN IF NOT EXISTS chatbot_welcome_message TEXT DEFAULT 'Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI''m your virtual assistant — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?';
