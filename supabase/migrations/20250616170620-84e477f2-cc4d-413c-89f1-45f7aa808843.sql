
-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_members table
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentions table
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add channel_id and mentioned_users columns to messages table
ALTER TABLE public.messages 
ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
ADD COLUMN mentioned_users TEXT[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for channels
CREATE POLICY "Users can view channels in their projects" 
  ON public.channels 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create channels" 
  ON public.channels 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their channels" 
  ON public.channels 
  FOR UPDATE 
  USING (true);

-- Create RLS policies for channel_members
CREATE POLICY "Users can view channel members" 
  ON public.channel_members 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can add channel members" 
  ON public.channel_members 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can remove channel members" 
  ON public.channel_members 
  FOR DELETE 
  USING (true);

-- Create RLS policies for mentions
CREATE POLICY "Users can view mentions" 
  ON public.mentions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create mentions" 
  ON public.mentions 
  FOR INSERT 
  WITH CHECK (true);
