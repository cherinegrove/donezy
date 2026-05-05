-- Add is_hidden flag to rbac_permissions
-- Hidden permissions are defined in DB but not yet surfaced in the UI
-- because the corresponding feature has not been built yet.
-- Set is_hidden = false to re-enable a permission in the UI once the feature ships.

ALTER TABLE public.rbac_permissions
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- Mark permissions whose features are not yet built
UPDATE public.rbac_permissions
SET is_hidden = true
WHERE name IN (
  -- Projects: unbuilt actions
  'projects:archive',
  'projects:restore',
  'projects:share',
  'projects:import',
  'projects:export',
  -- Time entries
  'time_entries:export',
  -- Clients
  'clients:export',
  -- Templates
  'templates:view',
  'templates:use',
  -- Integrations
  'integrations:view',
  'integrations:create',
  -- Messages
  'messages:send',
  -- Comments
  'comments:view',
  -- Permissions resource (no UI yet)
  'permissions:view',
  'permissions:create',
  'permissions:edit',
  'permissions:delete',
  -- Billing (no UI yet)
  'billing:view',
  'billing:create',
  'billing:edit',
  'billing:delete',
  'billing:export',
  -- Audit logs export
  'audit_logs:export',
  -- Platform settings view
  'platform_settings:view',
  -- Admin-only view gates not needed
  'statuses:view',
  'custom_fields:view'
);
