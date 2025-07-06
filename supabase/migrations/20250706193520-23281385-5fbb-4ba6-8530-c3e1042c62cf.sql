-- Create native field configurations table
CREATE TABLE public.native_field_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tasks', 'projects')),
  field_name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, entity_type, field_name)
);

-- Enable Row Level Security
ALTER TABLE public.native_field_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own native field configs" 
ON public.native_field_configs 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own native field configs" 
ON public.native_field_configs 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own native field configs" 
ON public.native_field_configs 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own native field configs" 
ON public.native_field_configs 
FOR DELETE 
USING (auth.uid() = auth_user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_native_field_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_native_field_configs_updated_at
BEFORE UPDATE ON public.native_field_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_native_field_configs_updated_at();