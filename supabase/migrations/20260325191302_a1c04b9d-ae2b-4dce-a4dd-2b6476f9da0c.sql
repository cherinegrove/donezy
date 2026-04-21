ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS awaiting_feedback_followup_date DATE;