-- Create integration_settings table for storing API keys and configurations
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  integration_name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_integration UNIQUE (auth_user_id, integration_name)
);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own integration settings
CREATE POLICY "Users can view their own integration settings"
ON public.integration_settings
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Users can insert their own integration settings
CREATE POLICY "Users can insert their own integration settings"
ON public.integration_settings
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Users can update their own integration settings
CREATE POLICY "Users can update their own integration settings"
ON public.integration_settings
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- Users can delete their own integration settings
CREATE POLICY "Users can delete their own integration settings"
ON public.integration_settings
FOR DELETE
USING (auth.uid() = auth_user_id);

-- Create index for faster lookups
CREATE INDEX idx_integration_settings_user_integration ON public.integration_settings(auth_user_id, integration_name);