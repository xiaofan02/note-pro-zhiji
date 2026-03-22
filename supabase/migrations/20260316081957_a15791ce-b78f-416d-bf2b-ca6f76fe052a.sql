
-- AI usage tracking table
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service can insert usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- System config table for admin to manage AI model settings
CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (needed by edge functions)
CREATE POLICY "Anyone can read config" ON public.system_config
  FOR SELECT USING (true);

-- Only admins can update (we'll check via has_role in app)
CREATE POLICY "Admins can manage config" ON public.system_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'pro'))
  WITH CHECK (public.has_role(auth.uid(), 'pro'));

-- Add 'admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Insert default AI config
INSERT INTO public.system_config (key, value) VALUES 
  ('ai_model', '{"provider": "lovable", "model": "google/gemini-3-flash-preview"}'::jsonb),
  ('free_daily_limit', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Index for usage queries
CREATE INDEX idx_ai_usage_user_date ON public.ai_usage (user_id, created_at);
