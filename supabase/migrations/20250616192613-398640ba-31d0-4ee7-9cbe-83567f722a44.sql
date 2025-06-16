
-- Create message_reactions table to store emoji reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view all reactions
CREATE POLICY "Users can view message reactions" 
  ON public.message_reactions 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Create policy that allows users to create reactions
CREATE POLICY "Users can create reactions" 
  ON public.message_reactions 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy that allows users to delete their own reactions
CREATE POLICY "Users can delete their own reactions" 
  ON public.message_reactions 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Create index for better performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Enable realtime for message reactions
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
