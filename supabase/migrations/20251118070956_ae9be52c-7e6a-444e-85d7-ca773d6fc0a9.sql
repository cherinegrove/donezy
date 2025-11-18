-- Create task_files table to store task files and external links
CREATE TABLE IF NOT EXISTS public.task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  file_path text,
  file_size integer,
  mime_type text,
  is_external_link boolean DEFAULT false,
  external_url text,
  external_provider text,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view files for accessible tasks"
  ON public.task_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_files.task_id
      AND (
        t.auth_user_id = auth.uid()
        OR t.assignee_id::text = auth.uid()::text
        OR auth.uid()::text = ANY(t.collaborator_ids)
        OR auth.uid()::text = ANY(t.watcher_ids)
      )
    )
  );

CREATE POLICY "Users can create files for accessible tasks"
  ON public.task_files
  FOR INSERT
  WITH CHECK (
    auth.uid() = auth_user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_files.task_id
      AND (
        t.auth_user_id = auth.uid()
        OR t.assignee_id::text = auth.uid()::text
        OR auth.uid()::text = ANY(t.collaborator_ids)
      )
    )
  );

CREATE POLICY "Users can delete their own task files"
  ON public.task_files
  FOR DELETE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own task files"
  ON public.task_files
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Create index for better query performance
CREATE INDEX idx_task_files_task_id ON public.task_files(task_id);