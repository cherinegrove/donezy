-- Create comments table for task comments
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  auth_user_id uuid NOT NULL DEFAULT auth.uid(),
  user_id text NOT NULL,
  content text NOT NULL,
  mentioned_user_ids text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Users can view comments for their tasks"
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = comments.task_id 
    AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comments for their tasks"
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = auth_user_id AND
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = comments.task_id 
    AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments"
ON public.comments 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments 
FOR DELETE 
USING (auth.uid() = auth_user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_project_notes_updated_at();