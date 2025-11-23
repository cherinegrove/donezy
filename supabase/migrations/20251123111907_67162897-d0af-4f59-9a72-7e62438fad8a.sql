-- Add fields to tasks table for weekly roundup context
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS backlog_reason text,
ADD COLUMN IF NOT EXISTS awaiting_feedback_details text,
ADD COLUMN IF NOT EXISTS due_date_change_reason text,
ADD COLUMN IF NOT EXISTS last_due_date_change timestamp with time zone;