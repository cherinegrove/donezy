-- Add reminder_date column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN reminder_date TIMESTAMP WITH TIME ZONE;

-- Create a table to track sent reminders to avoid duplicates
CREATE TABLE public.task_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_date', 'custom_reminder')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent_to TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_reminders
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for task_reminders
CREATE POLICY "Users can view reminders for their tasks"
ON public.task_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_reminders.task_id
    AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "System can insert reminders"
ON public.task_reminders
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_task_reminders_task_id ON public.task_reminders(task_id);
CREATE INDEX idx_task_reminders_sent_at ON public.task_reminders(sent_at);
CREATE INDEX idx_tasks_reminder_date ON public.tasks(reminder_date);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);