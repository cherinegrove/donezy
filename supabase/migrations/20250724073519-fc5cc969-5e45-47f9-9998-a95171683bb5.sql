-- Create project_notes table
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  auth_user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own project notes" 
ON public.project_notes 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view their own project notes" 
ON public.project_notes 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project notes" 
ON public.project_notes 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project notes" 
ON public.project_notes 
FOR DELETE 
USING (auth.uid() = auth_user_id);

-- Create project_files table
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  auth_user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for project files
CREATE POLICY "Users can create their own project files" 
ON public.project_files 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view their own project files" 
ON public.project_files 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project files" 
ON public.project_files 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project files" 
ON public.project_files 
FOR DELETE 
USING (auth.uid() = auth_user_id);

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Create storage policies
CREATE POLICY "Users can upload their own project files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own project files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own project files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

-- Create update trigger for project_notes
CREATE OR REPLACE FUNCTION public.update_project_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_notes_updated_at
BEFORE UPDATE ON public.project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_project_notes_updated_at();