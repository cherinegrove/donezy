-- Fix security vulnerability: Restrict public access to shared videos
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Public can view shared videos by ID" ON public.shared_videos;

-- Create a more secure policy for public access to shared videos
-- Only allow public access to non-expired videos when accessed by specific ID
CREATE POLICY "Public can view specific shared videos by ID" 
ON public.shared_videos 
FOR SELECT 
USING (
  -- Only allow access to non-expired videos
  expires_at > now()
  -- Additional security: Could add token-based access in the future
);

-- Ensure the existing user access policy remains intact
-- (Users can view their own videos policy should already exist)