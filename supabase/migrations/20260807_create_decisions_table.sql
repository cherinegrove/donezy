-- Create decisions table for storing project decisions and reasoning
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  tradeoffs TEXT NOT NULL,
  owner_id UUID,
  owner_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);

-- Create index for searching by title/reasoning
CREATE INDEX IF NOT EXISTS idx_decisions_text_search ON decisions USING gin(
  to_tsvector('english', title || ' ' || reasoning)
);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- Enable RLS (Row Level Security)
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view decisions in their organization
CREATE POLICY "Users can view decisions in their organization"
  ON decisions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE client_id IN (
        SELECT id FROM clients
        WHERE organization_id = (
          SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Create policy for users to insert decisions
CREATE POLICY "Users can insert decisions"
  ON decisions FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE client_id IN (
        SELECT id FROM clients
        WHERE organization_id = (
          SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Create policy for users to update their own decisions
CREATE POLICY "Users can update their own decisions"
  ON decisions FOR UPDATE
  USING (owner_id = auth.uid());
