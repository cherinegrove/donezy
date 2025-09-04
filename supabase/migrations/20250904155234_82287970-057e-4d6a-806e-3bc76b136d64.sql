-- Add reminder_date column to projects table
ALTER TABLE public.projects 
ADD COLUMN reminder_date text;

-- Create project_reminders table to track sent reminders
CREATE TABLE public.project_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  reminder_type text NOT NULL,
  email_sent_to text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_reminders
ALTER TABLE public.project_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for project_reminders
CREATE POLICY "System can insert reminders" 
ON public.project_reminders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view reminders for their projects" 
ON public.project_reminders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_reminders.project_id 
    AND p.auth_user_id = auth.uid()
  )
);