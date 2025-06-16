
-- Add parent_message_id column to messages table to support threaded replies
ALTER TABLE public.messages 
ADD COLUMN parent_message_id UUID REFERENCES public.messages(id);

-- Create an index for better performance when querying replies
CREATE INDEX idx_messages_parent_message_id ON public.messages(parent_message_id);

-- Enable realtime for the messages table to get live updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
