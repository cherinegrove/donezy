-- Create project_folders table
CREATE TABLE public.project_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  auth_user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for project_folders
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for project_folders
CREATE POLICY "Users can create their own project folders" 
ON public.project_folders 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view their own project folders" 
ON public.project_folders 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own project folders" 
ON public.project_folders 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own project folders" 
ON public.project_folders 
FOR DELETE 
USING (auth.uid() = auth_user_id);

-- Add folder_id to project_files table
ALTER TABLE public.project_files 
ADD COLUMN folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL;

-- Add external link support to project_files
ALTER TABLE public.project_files 
ADD COLUMN is_external_link BOOLEAN DEFAULT false,
ADD COLUMN external_url TEXT,
ADD COLUMN external_provider TEXT; -- 'google_drive', 'dropbox', 'onedrive', 'sharepoint', 'other'

-- Make file_path and file_size nullable for external links
ALTER TABLE public.project_files 
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_size DROP NOT NULL;

-- Add constraint to ensure external links have URL
ALTER TABLE public.project_files 
ADD CONSTRAINT check_external_link_url 
CHECK (
  (is_external_link = false AND file_path IS NOT NULL AND file_size IS NOT NULL) OR 
  (is_external_link = true AND external_url IS NOT NULL)
);