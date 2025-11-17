-- Create recurring tasks patterns table
CREATE TABLE public.recurring_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  collaborator_ids TEXT[] DEFAULT '{}',
  estimated_hours INTEGER,
  
  -- Recurrence settings
  recurrence_pattern TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  recurrence_interval INTEGER NOT NULL DEFAULT 1, -- e.g., every 2 weeks
  days_of_week INTEGER[], -- For weekly: 0=Sunday, 1=Monday, etc.
  day_of_month INTEGER, -- For monthly: 1-31
  
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE, -- NULL = indefinite
  next_generation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_generated_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT recurring_tasks_project_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recurring tasks"
  ON public.recurring_tasks FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own recurring tasks"
  ON public.recurring_tasks FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own recurring tasks"
  ON public.recurring_tasks FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own recurring tasks"
  ON public.recurring_tasks FOR DELETE
  USING (auth.uid() = auth_user_id);

-- Create index for efficient querying
CREATE INDEX idx_recurring_tasks_next_generation ON public.recurring_tasks(next_generation_date) WHERE is_active = true;
CREATE INDEX idx_recurring_tasks_auth_user ON public.recurring_tasks(auth_user_id);