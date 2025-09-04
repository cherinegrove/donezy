-- Create a table to track sent reminders to avoid duplicates (skip reminder_date as it already exists)
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_date', 'custom_reminder')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent_to TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_reminders (if not already enabled)
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for task_reminders (if not already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_reminders' 
    AND policyname = 'Users can view reminders for their tasks'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_reminders' 
    AND policyname = 'System can insert reminders'
  ) THEN
    CREATE POLICY "System can insert reminders"
    ON public.task_reminders
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for efficient querying (if not already exist)
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON public.task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_sent_at ON public.task_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_date ON public.tasks(reminder_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);