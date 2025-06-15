
-- Create project_templates table
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'project',
  default_duration INTEGER NOT NULL DEFAULT 30,
  allocated_hours INTEGER NOT NULL DEFAULT 0,
  custom_fields TEXT[] DEFAULT '{}',
  team_ids TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_templates table  
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_hours INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_templates
CREATE POLICY "Users can view their own project templates" 
  ON public.project_templates 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own project templates" 
  ON public.project_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project templates" 
  ON public.project_templates 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project templates" 
  ON public.project_templates 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);

-- Create RLS policies for task_templates
CREATE POLICY "Users can view their own task templates" 
  ON public.task_templates 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own task templates" 
  ON public.task_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own task templates" 
  ON public.task_templates 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own task templates" 
  ON public.task_templates 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);
