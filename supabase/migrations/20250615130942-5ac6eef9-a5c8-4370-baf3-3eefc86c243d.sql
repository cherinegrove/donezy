
-- Create table for custom fields
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'date', 'dropdown', 'multiselect', 'checkbox', 'number')),
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  applicable_to TEXT[] NOT NULL DEFAULT '{}',
  options TEXT[],
  default_value JSONB,
  field_order INTEGER NOT NULL DEFAULT 0,
  reportable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for custom fields
CREATE POLICY "Users can view their own custom fields" 
  ON public.custom_fields 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own custom fields" 
  ON public.custom_fields 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own custom fields" 
  ON public.custom_fields 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own custom fields" 
  ON public.custom_fields 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);
