
-- Add a table to store template tasks that belong to project templates
CREATE TABLE public.project_template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
);

-- Add a table to store template subtasks
CREATE TABLE public.project_template_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_task_id UUID NOT NULL,
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (template_task_id) REFERENCES project_template_tasks(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.project_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_template_tasks
CREATE POLICY "Users can view their own project template tasks" 
  ON public.project_template_tasks 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own project template tasks" 
  ON public.project_template_tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project template tasks" 
  ON public.project_template_tasks 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project template tasks" 
  ON public.project_template_tasks 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);

-- Create RLS policies for project_template_subtasks
CREATE POLICY "Users can view their own project template subtasks" 
  ON public.project_template_subtasks 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own project template subtasks" 
  ON public.project_template_subtasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project template subtasks" 
  ON public.project_template_subtasks 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project template subtasks" 
  ON public.project_template_subtasks 
  FOR DELETE 
  USING (auth.uid() = auth_user_id);
