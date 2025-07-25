-- Add association fields to notes table
ALTER TABLE public.notes 
ADD COLUMN project_id uuid REFERENCES public.projects(id),
ADD COLUMN client_id uuid REFERENCES public.clients(id),
ADD COLUMN task_id uuid REFERENCES public.tasks(id);

-- Add index for better query performance
CREATE INDEX idx_notes_project_id ON public.notes(project_id);
CREATE INDEX idx_notes_client_id ON public.notes(client_id);
CREATE INDEX idx_notes_task_id ON public.notes(task_id);