-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies - users can manage their own templates
CREATE POLICY "Users can view their own email templates"
ON public.email_templates
FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own email templates"
ON public.email_templates
FOR UPDATE
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own email templates"
ON public.email_templates
FOR DELETE
USING (auth.uid() = auth_user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_email_templates_updated_at();