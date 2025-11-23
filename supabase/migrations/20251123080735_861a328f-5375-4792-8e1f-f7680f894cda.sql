-- Create a table for daily check-ins
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  yesterday TEXT,
  today TEXT NOT NULL,
  blockers TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for check-ins
CREATE POLICY "Users can view all check-ins" 
ON public.check_ins 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own check-ins" 
ON public.check_ins 
FOR INSERT 
WITH CHECK (auth.uid()::text = auth_user_id);

CREATE POLICY "Users can update their own check-ins" 
ON public.check_ins 
FOR UPDATE 
USING (auth.uid()::text = auth_user_id);

CREATE POLICY "Users can delete their own check-ins" 
ON public.check_ins 
FOR DELETE 
USING (auth.uid()::text = auth_user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_check_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_check_ins_updated_at
BEFORE UPDATE ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_check_ins_updated_at();

-- Enable realtime for check_ins
ALTER TABLE public.check_ins REPLICA IDENTITY FULL;

-- Enable realtime for task_logs (for activity feed)
ALTER TABLE public.task_logs REPLICA IDENTITY FULL;