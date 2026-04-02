-- ============================================================
-- RBAC Schema Migration
-- Creates: rbac_resources, rbac_permissions, rbac_roles,
--          rbac_role_permissions, rbac_user_roles
-- ============================================================

-- 1. Resources table (what can be accessed)
CREATE TABLE IF NOT EXISTS rbac_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Permissions table (resource + action, NO SCOPE)
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,               -- 'projects:view', 'tasks:create', etc.
  resource TEXT NOT NULL,                  -- references rbac_resources.name
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource, action)
);

-- 3. Roles table (named collection of permissions)
CREATE TABLE IF NOT EXISTS rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10b981',
  is_system BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Role ↔ Permission junction (SCOPE LIVES HERE)
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'own',       -- 'own', 'project', 'all'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- 5. User ↔ Role junction
CREATE TABLE IF NOT EXISTS rbac_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_resource ON rbac_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_action ON rbac_permissions(action);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role_id ON rbac_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_permission_id ON rbac_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user_id ON rbac_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_role_id ON rbac_user_roles(role_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_rbac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbac_resources_updated_at
  BEFORE UPDATE ON rbac_resources
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

CREATE TRIGGER trg_rbac_permissions_updated_at
  BEFORE UPDATE ON rbac_permissions
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

CREATE TRIGGER trg_rbac_roles_updated_at
  BEFORE UPDATE ON rbac_roles
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

-- ============================================================
-- RLS Policies (permissive for now — tighten in Phase 3)
-- ============================================================

ALTER TABLE rbac_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read RBAC metadata
CREATE POLICY "rbac_resources_select" ON rbac_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_permissions_select" ON rbac_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_roles_select" ON rbac_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_role_permissions_select" ON rbac_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_user_roles_select" ON rbac_user_roles FOR SELECT TO authenticated USING (true);

-- Only admins can modify (checked via old system_roles for now, will update in Phase 3)
CREATE POLICY "rbac_resources_modify" ON rbac_resources FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid() AND sr.name = 'platform_admin'
  ));

CREATE POLICY "rbac_permissions_modify" ON rbac_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid() AND sr.name = 'platform_admin'
  ));

CREATE POLICY "rbac_roles_modify" ON rbac_roles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid() AND sr.name = 'platform_admin'
  ));

CREATE POLICY "rbac_role_permissions_modify" ON rbac_role_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid() AND sr.name = 'platform_admin'
  ));

CREATE POLICY "rbac_user_roles_modify" ON rbac_user_roles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_system_roles usr
    JOIN system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid() AND sr.name = 'platform_admin'
  ));

-- ============================================================
-- Helper function: Check if user has a specific RBAC permission
-- ============================================================

CREATE OR REPLACE FUNCTION rbac_user_has_permission(
  _user_id UUID,
  _resource TEXT,
  _action TEXT,
  _required_scope TEXT DEFAULT 'own'
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rbac_user_roles ur
    JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
      AND (
        -- Scope hierarchy: 'all' covers everything, 'project' covers project+own, 'own' covers own
        rp.scope = 'all'
        OR (rp.scope = 'project' AND _required_scope IN ('project', 'own'))
        OR (rp.scope = _required_scope)
      )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- SEED DATA: Resources
-- ============================================================

INSERT INTO rbac_resources (name, display_name, description) VALUES
  ('projects',          'Projects',          'Project management'),
  ('tasks',             'Tasks',             'Task management'),
  ('time_entries',      'Time Entries',      'Time tracking'),
  ('users',             'Users',             'User management'),
  ('teams',             'Teams',             'Team management'),
  ('clients',           'Clients',           'Client management'),
  ('roles',             'Roles',             'Role management'),
  ('permissions',       'Permissions',       'Permission management'),
  ('templates',         'Templates',         'Project/task templates'),
  ('statuses',          'Statuses',          'Task/project status definitions'),
  ('custom_fields',     'Custom Fields',     'Custom field definitions'),
  ('notes',             'Notes',             'Personal notes'),
  ('messages',          'Messages',          'Internal messaging'),
  ('comments',          'Comments',          'Task comments'),
  ('analytics',         'Analytics',         'Dashboards and reports'),
  ('dashboards',        'Dashboards',        'Custom dashboards'),
  ('billing',           'Billing',           'Billing and purchases'),
  ('settings',          'Settings',          'User settings'),
  ('integrations',      'Integrations',      'Third-party integrations'),
  ('audit_logs',        'Audit Logs',        'Activity logs'),
  ('notifications',     'Notifications',     'User notifications'),
  ('platform_settings', 'Platform Settings', 'Platform-wide admin settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Permissions
-- ============================================================

INSERT INTO rbac_permissions (name, resource, action, description) VALUES
  -- Projects
  ('projects:view',    'projects', 'view',    'View project details and list'),
  ('projects:create',  'projects', 'create',  'Create new projects'),
  ('projects:edit',    'projects', 'edit',    'Edit project details'),
  ('projects:delete',  'projects', 'delete',  'Delete projects'),
  ('projects:archive', 'projects', 'archive', 'Archive projects'),
  ('projects:restore', 'projects', 'restore', 'Restore archived projects'),
  ('projects:share',   'projects', 'share',   'Share project externally'),
  ('projects:import',  'projects', 'import',  'Import projects from file'),
  ('projects:export',  'projects', 'export',  'Export project data'),
  -- Tasks
  ('tasks:view',       'tasks',    'view',    'View task details and list'),
  ('tasks:create',     'tasks',    'create',  'Create new tasks'),
  ('tasks:edit',       'tasks',    'edit',    'Edit task details'),
  ('tasks:delete',     'tasks',    'delete',  'Delete tasks'),
  -- Time Entries
  ('time_entries:view',    'time_entries', 'view',    'View time entries'),
  ('time_entries:perform', 'time_entries', 'perform', 'Add/edit/start/stop time entries'),
  ('time_entries:manage',  'time_entries', 'manage',  'Approve/reject time entries'),
  ('time_entries:export',  'time_entries', 'export',  'Export time data'),
  -- Users
  ('users:view',       'users',    'view',    'View user details and list'),
  ('users:create',     'users',    'create',  'Create new users'),
  ('users:edit',       'users',    'edit',    'Edit user details'),
  ('users:delete',     'users',    'delete',  'Delete users'),
  ('users:manage',     'users',    'manage',  'Activate/deactivate/assign roles'),
  ('users:import',     'users',    'import',  'Import users from file'),
  ('users:export',     'users',    'export',  'Export user data'),
  -- Teams
  ('teams:view',       'teams',    'view',    'View team details and list'),
  ('teams:create',     'teams',    'create',  'Create new teams'),
  ('teams:edit',       'teams',    'edit',    'Edit team details'),
  ('teams:delete',     'teams',    'delete',  'Delete teams'),
  ('teams:manage',     'teams',    'manage',  'Add/remove team members'),
  -- Clients
  ('clients:view',     'clients',  'view',    'View client details and list'),
  ('clients:create',   'clients',  'create',  'Create new clients'),
  ('clients:edit',     'clients',  'edit',    'Edit client details'),
  ('clients:delete',   'clients',  'delete',  'Delete clients'),
  ('clients:export',   'clients',  'export',  'Export client data'),
  -- Notes
  ('notes:view',       'notes',    'view',    'View notes'),
  ('notes:create',     'notes',    'create',  'Create notes'),
  ('notes:edit',       'notes',    'edit',    'Edit notes'),
  ('notes:delete',     'notes',    'delete',  'Delete notes'),
  -- Messages
  ('messages:view',    'messages', 'view',    'View messages'),
  ('messages:create',  'messages', 'create',  'Create messages'),
  ('messages:edit',    'messages', 'edit',    'Edit messages'),
  ('messages:delete',  'messages', 'delete',  'Delete messages'),
  ('messages:send',    'messages', 'send',    'Send messages'),
  -- Comments
  ('comments:view',    'comments', 'view',    'View comments'),
  ('comments:create',  'comments', 'create',  'Create comments'),
  ('comments:edit',    'comments', 'edit',    'Edit comments'),
  -- Roles
  ('roles:view',       'roles',    'view',    'View roles'),
  ('roles:create',     'roles',    'create',  'Create custom roles'),
  ('roles:edit',       'roles',    'edit',    'Edit roles'),
  ('roles:delete',     'roles',    'delete',  'Delete custom roles'),
  -- Permissions
  ('permissions:view',   'permissions', 'view',   'View permissions'),
  ('permissions:create', 'permissions', 'create', 'Create custom permissions'),
  ('permissions:edit',   'permissions', 'edit',   'Edit permissions'),
  ('permissions:delete', 'permissions', 'delete', 'Delete custom permissions'),
  -- Templates
  ('templates:view',   'templates', 'view',   'View templates'),
  ('templates:create', 'templates', 'create', 'Create templates'),
  ('templates:edit',   'templates', 'edit',   'Edit templates'),
  ('templates:delete', 'templates', 'delete', 'Delete templates'),
  ('templates:use',    'templates', 'use',    'Use template to create item'),
  -- Statuses
  ('statuses:view',    'statuses', 'view',       'View status definitions'),
  ('statuses:create',  'statuses', 'create',     'Create status definitions'),
  ('statuses:edit',    'statuses', 'edit',       'Edit status definitions'),
  ('statuses:delete',  'statuses', 'delete',     'Delete status definitions'),
  -- Custom Fields
  ('custom_fields:view',   'custom_fields', 'view',   'View custom fields'),
  ('custom_fields:create', 'custom_fields', 'create', 'Create custom fields'),
  ('custom_fields:edit',   'custom_fields', 'edit',   'Edit custom fields'),
  ('custom_fields:delete', 'custom_fields', 'delete', 'Delete custom fields'),
  -- Settings
  ('settings:view',    'settings', 'view', 'View user settings'),
  ('settings:edit',    'settings', 'edit', 'Edit user settings'),
  -- Integrations
  ('integrations:view',   'integrations', 'view',   'View integrations'),
  ('integrations:create', 'integrations', 'create', 'Create integrations'),
  ('integrations:edit',   'integrations', 'edit',   'Edit integrations'),
  -- Notifications
  ('notifications:view',  'notifications', 'view', 'View notifications'),
  -- Audit Logs
  ('audit_logs:view',   'audit_logs', 'view',   'View audit logs'),
  ('audit_logs:export', 'audit_logs', 'export', 'Export audit logs'),
  -- Analytics
  ('analytics:view',   'analytics', 'view', 'View analytics'),
  -- Dashboards
  ('dashboards:view',   'dashboards', 'view',   'View dashboards'),
  ('dashboards:create', 'dashboards', 'create', 'Create dashboards/reports'),
  ('dashboards:edit',   'dashboards', 'edit',   'Edit dashboards/reports'),
  ('dashboards:delete', 'dashboards', 'delete', 'Delete dashboards/reports'),
  -- Billing
  ('billing:view',     'billing', 'view',   'View billing information'),
  ('billing:create',   'billing', 'create', 'Create billing entries'),
  ('billing:edit',     'billing', 'edit',   'Edit billing entries'),
  ('billing:delete',   'billing', 'delete', 'Delete billing entries'),
  ('billing:export',   'billing', 'export', 'Export billing data'),
  -- Platform Settings
  ('platform_settings:view', 'platform_settings', 'view', 'View platform settings'),
  ('platform_settings:edit', 'platform_settings', 'edit', 'Edit platform settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Default Roles
-- ============================================================

-- Platform Superadmin (all permissions)
INSERT INTO rbac_roles (id, name, description, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Platform Superadmin', 'Full platform access with all permissions', '#ef4444', true)
ON CONFLICT (id) DO NOTHING;

-- Project Owner
INSERT INTO rbac_roles (id, name, description, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Project Owner', 'Full access to owned projects and related resources', '#f59e0b', true)
ON CONFLICT (id) DO NOTHING;

-- Project Collaborator
INSERT INTO rbac_roles (id, name, description, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Project Collaborator', 'Can work on assigned project tasks', '#3b82f6', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Assign ALL permissions to Platform Superadmin (Scope: ALL)
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id, scope)
SELECT '00000000-0000-0000-0000-000000000001', id, 'all'
FROM rbac_permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- Assign permissions to Project Owner
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id, scope)
SELECT '00000000-0000-0000-0000-000000000002', p.id,
  CASE 
    WHEN p.name LIKE 'projects:%' THEN 'own'
    WHEN p.name LIKE 'tasks:%' THEN 'project'
    WHEN p.name LIKE 'time_entries:%' THEN 'own'
    WHEN p.name LIKE 'notes:%' THEN 'project'
    WHEN p.name LIKE 'messages:%' THEN 'project'
    WHEN p.name LIKE 'comments:%' THEN 'project'
    WHEN p.name LIKE 'analytics:%' THEN 'project'
    WHEN p.name LIKE 'dashboards:%' THEN 'project'
    WHEN p.name LIKE 'audit_logs:%' THEN 'project'
    WHEN p.name LIKE 'notifications:%' THEN 'own'
    WHEN p.name LIKE 'settings:%' THEN 'own'
    ELSE 'own'
  END
FROM rbac_permissions p
WHERE p.name IN (
  'projects:view', 'projects:edit', 'projects:archive', 'projects:restore',
  'projects:share', 'projects:import', 'projects:export',
  'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
  'time_entries:view', 'time_entries:perform', 'time_entries:export',
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'messages:view', 'messages:create', 'messages:edit', 'messages:delete', 'messages:send',
  'comments:view', 'comments:create', 'comments:edit',
  'analytics:view', 'dashboards:view', 'dashboards:create', 'dashboards:edit', 'dashboards:delete',
  'audit_logs:view', 'audit_logs:export',
  'notifications:view',
  'settings:view', 'settings:edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- Assign permissions to Project Collaborator
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id, scope)
SELECT '00000000-0000-0000-0000-000000000003', p.id,
  CASE 
    WHEN p.name LIKE 'projects:%' THEN 'own'
    WHEN p.name LIKE 'tasks:%' THEN 'project'
    WHEN p.name LIKE 'time_entries:%' THEN 'own'
    WHEN p.name LIKE 'notes:%' THEN 'project'
    WHEN p.name LIKE 'messages:%' THEN 'project'
    WHEN p.name LIKE 'comments:%' THEN 'project'
    WHEN p.name LIKE 'analytics:%' THEN 'own'
    WHEN p.name LIKE 'dashboards:%' THEN 'own'
    WHEN p.name LIKE 'audit_logs:%' THEN 'own'
    WHEN p.name LIKE 'notifications:%' THEN 'own'
    WHEN p.name LIKE 'settings:%' THEN 'own'
    ELSE 'own'
  END
FROM rbac_permissions p
WHERE p.name IN (
  'projects:view',
  'tasks:view', 'tasks:create', 'tasks:edit',
  'time_entries:view', 'time_entries:perform',
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'messages:view', 'messages:create', 'messages:edit', 'messages:delete', 'messages:send',
  'comments:view', 'comments:create', 'comments:edit',
  'analytics:view', 'dashboards:view', 'dashboards:create', 'dashboards:edit', 'dashboards:delete',
  'audit_logs:view',
  'notifications:view',
  'settings:view', 'settings:edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
