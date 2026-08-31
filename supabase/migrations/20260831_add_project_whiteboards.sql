-- Create project_whiteboards table for storing Excalidraw drawings
CREATE TABLE IF NOT EXISTS project_whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create index for project_id lookups
CREATE INDEX idx_project_whiteboards_project_id ON project_whiteboards(project_id);

-- Create index for created_by lookups
CREATE INDEX idx_project_whiteboards_created_by ON project_whiteboards(created_by);

-- Enable RLS
ALTER TABLE project_whiteboards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view whiteboards for projects they have access to
CREATE POLICY "Users can view whiteboards for their projects"
  ON project_whiteboards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_whiteboards.project_id
      AND (
        p.ownerId = auth.uid()
        OR auth.uid() = ANY(p.collaboratorIds)
        OR auth.uid() IN (
          SELECT user_id FROM project_members WHERE project_id = p.id
        )
      )
    )
  );

-- RLS Policy: Users can insert whiteboards for projects they own/collaborate on
CREATE POLICY "Users can create whiteboards for their projects"
  ON project_whiteboards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_whiteboards.project_id
      AND (
        p.ownerId = auth.uid()
        OR auth.uid() = ANY(p.collaboratorIds)
      )
    )
  );

-- RLS Policy: Users can update whiteboards they created or have access to
CREATE POLICY "Users can update whiteboards for their projects"
  ON project_whiteboards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_whiteboards.project_id
      AND (
        p.ownerId = auth.uid()
        OR auth.uid() = ANY(p.collaboratorIds)
      )
    )
  );
