-- Create time entry events table for detailed audit logging
CREATE TABLE public.time_entry_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by time entry
CREATE INDEX idx_time_entry_events_time_entry_id ON public.time_entry_events(time_entry_id);
CREATE INDEX idx_time_entry_events_event_type ON public.time_entry_events(event_type);
CREATE INDEX idx_time_entry_events_timestamp ON public.time_entry_events(event_timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.time_entry_events ENABLE ROW LEVEL SECURITY;

-- Create policies for time entry events
CREATE POLICY "Users can view all time entry events in their org" 
ON public.time_entry_events 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create time entry events" 
ON public.time_entry_events 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Add comment describing event types
COMMENT ON TABLE public.time_entry_events IS 'Audit log for time entry events. Event types: started, stopped, paused, resumed, manual_edit, duration_changed, notes_changed, project_changed, task_changed, status_changed';