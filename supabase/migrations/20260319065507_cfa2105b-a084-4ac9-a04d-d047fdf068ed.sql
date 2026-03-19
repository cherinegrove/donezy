CREATE TABLE public.google_chat_thread_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_key TEXT NOT NULL,
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  space_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_google_chat_thread_mappings_thread_key ON public.google_chat_thread_mappings (thread_key);

ALTER TABLE public.google_chat_thread_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage thread mappings"
  ON public.google_chat_thread_mappings
  FOR ALL
  USING (true)
  WITH CHECK (true);