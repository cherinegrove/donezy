-- Create error_logs table for tracking backend errors
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type varchar(255) NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint varchar(255),
  status_code integer,
  request_data jsonb,
  response_data jsonb,
  context jsonb,
  severity varchar(50) DEFAULT 'error',
  resolved boolean DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view error logs
CREATE POLICY "Only admins can view error logs"
  ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policy: System can insert error logs
CREATE POLICY "System can insert error logs"
  ON error_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Only admins can update error logs (mark as resolved)
CREATE POLICY "Only admins can update error logs"
  ON error_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
    )
  );
