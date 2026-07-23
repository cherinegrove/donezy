-- Add HubSpot integration fields to projects and clients tables

-- Add hubspot_deal_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS hubspot_deal_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_hubspot_deal_id
ON projects(hubspot_deal_id);

-- Add hubspot_company_id to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS hubspot_company_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_company_id
ON clients(hubspot_company_id, user_id);

-- Add comments documenting the fields
COMMENT ON COLUMN projects.hubspot_deal_id IS 'HubSpot deal ID - used for bidirectional sync between HubSpot deals and Donezy projects';
COMMENT ON COLUMN clients.hubspot_company_id IS 'HubSpot company ID - used to link Donezy clients with HubSpot companies';
