-- Create storage bucket for comment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-images', 'comment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for comment images
CREATE POLICY "Users can upload comment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comment-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view comment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'comment-images');

CREATE POLICY "Users can delete their own comment images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comment-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add images column to comments table to store image URLs
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';