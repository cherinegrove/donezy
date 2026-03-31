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

-- 2. Permissions table (resource + action + scope)
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,               -- 'projects:view', 'tasks:create', etc.
  resource TEXT NOT NULL,                  -- references rbac_resources.name
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'own',       -- 'own', 'project', 'all'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource, action, scope)
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

-- 4. Role ↔ Permission junction
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
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
        p.scope = 'all'
        OR (p.scope = 'project' AND _required_scope IN ('project', 'own'))
        OR (p.scope = _required_scope)
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

INSERT INTO rbac_permissions (name, resource, action, scope, description) VALUES
  -- Projects
  ('projects:view',    'projects', 'view',    'own',     'View project details and list'),
  ('projects:create',  'projects', 'create',  'own',     'Create new projects'),
  ('projects:edit',    'projects', 'edit',    'own',     'Edit project details'),
  ('projects:delete',  'projects', 'delete',  'own',     'Delete projects'),
  ('projects:archive', 'projects', 'archive', 'own',     'Archive projects'),
  ('projects:restore', 'projects', 'restore', 'own',     'Restore archived projects'),
  ('projects:share',   'projects', 'share',   'own',     'Share project externally'),
  ('projects:import',  'projects', 'import',  'own',     'Import projects from file'),
  ('projects:export',  'projects', 'export',  'own',     'Export project data'),
  -- Tasks
  ('tasks:view',       'tasks',    'view',    'project', 'View task details and list'),
  ('tasks:create',     'tasks',    'create',  'project', 'Create new tasks'),
  ('tasks:edit',       'tasks',    'edit',    'project', 'Edit task details'),
  ('tasks:delete',     'tasks',    'delete',  'project', 'Delete tasks'),
  -- Time Entries
  ('time_entries:view',    'time_entries', 'view',    'own',     'View time entries'),
  ('time_entries:perform', 'time_entries', 'perform', 'own',     'Add/edit/start/stop time entries'),
  ('time_entries:manage',  'time_entries', 'manage',  'own',     'Approve/reject time entries'),
  ('time_entries:export',  'time_entries', 'export',  'own',     'Export time data'),
  -- Users
  ('users:view',       'users',    'view',    'all',     'View user details and list'),
  ('users:create',     'users',    'create',  'all',     'Create new users'),
  ('users:edit',       'users',    'edit',    'all',     'Edit user details'),
  ('users:delete',     'users',    'delete',  'all',     'Delete users'),
  ('users:manage',     'users',    'manage',  'all',     'Activate/deactivate/assign roles'),
  ('users:import',     'users',    'import',  'all',     'Import users from file'),
  ('users:export',     'users',    'export',  'all',     'Export user data'),
  -- Teams
  ('teams:view',       'teams',    'view',    'all',     'View team details and list'),
  ('teams:create',     'teams',    'create',  'all',     'Create new teams'),
  ('teams:edit',       'teams',    'edit',    'all',     'Edit team details'),
  ('teams:delete',     'teams',    'delete',  'all',     'Delete teams'),
  ('teams:manage',     'teams',    'manage',  'all',     'Add/remove team members'),
  -- Clients
  ('clients:view',     'clients',  'view',    'all',     'View client details and list'),
  ('clients:create',   'clients',  'create',  'all',     'Create new clients'),
  ('clients:edit',     'clients',  'edit',    'all',     'Edit client details'),
  ('clients:delete',   'clients',  'delete',  'all',     'Delete clients'),
  ('clients:export',   'clients',  'export',  'all',     'Export client data'),
  -- Notes
  ('notes:view',       'notes',    'view',    'project', 'View notes'),
  ('notes:create',     'notes',    'create',  'project', 'Create notes'),
  ('notes:edit',       'notes',    'edit',    'project', 'Edit notes'),
  ('notes:delete',     'notes',    'delete',  'project', 'Delete notes'),
  -- Messages
  ('messages:view',    'messages', 'view',    'project', 'View messages'),
  ('messages:create',  'messages', 'create',  'project', 'Create messages'),
  ('messages:edit',    'messages', 'edit',    'project', 'Edit messages'),
  ('messages:delete',  'messages', 'delete',  'project', 'Delete messages'),
  ('messages:send',    'messages', 'send',    'project', 'Send messages'),
  -- Comments
  ('comments:view',    'comments', 'view',    'project', 'View comments'),
  ('comments:create',  'comments', 'create',  'project', 'Create comments'),
  ('comments:edit',    'comments', 'edit',    'project', 'Edit comments'),
  -- Roles
  ('roles:view',       'roles',    'view',    'all',     'View roles'),
  ('roles:create',     'roles',    'create',  'all',     'Create custom roles'),
  ('roles:edit',       'roles',    'edit',    'all',     'Edit roles'),
  ('roles:delete',     'roles',    'delete',  'all',     'Delete custom roles'),
  -- Permissions
  ('permissions:view',   'permissions', 'view',   'all',  'View permissions'),
  ('permissions:create', 'permissions', 'create', 'all',  'Create custom permissions'),
  ('permissions:edit',   'permissions', 'edit',   'all',  'Edit permissions'),
  ('permissions:delete', 'permissions', 'delete', 'all',  'Delete custom permissions'),
  -- Templates
  ('templates:view',   'templates', 'view',   'all',     'View templates'),
  ('templates:create', 'templates', 'create', 'all',     'Create templates'),
  ('templates:edit',   'templates', 'edit',   'all',     'Edit templates'),
  ('templates:delete', 'templates', 'delete', 'all',     'Delete templates'),
  ('templates:use',    'templates', 'use',    'all',     'Use template to create item'),
  -- Statuses
  ('statuses:view',    'statuses', 'view',   'all',      'View status definitions'),
  ('statuses:create',  'statuses', 'create', 'all',      'Create status definitions'),
  ('statuses:edit',    'statuses', 'edit',   'all',      'Edit status definitions'),
  ('statuses:delete',  'statuses', 'delete', 'all',      'Delete status definitions'),
  -- Custom Fields
  ('custom_fields:view',   'custom_fields', 'view',   'all', 'View custom fields'),
  ('custom_fields:create', 'custom_fields', 'create', 'all', 'Create custom fields'),
  ('custom_fields:edit',   'custom_fields', 'edit',   'all', 'Edit custom fields'),
  ('custom_fields:delete', 'custom_fields', 'delete', 'all', 'Delete custom fields'),
  -- Settings
  ('settings:view',    'settings', 'view', 'own',       'View user settings'),
  ('settings:edit',    'settings', 'edit', 'own',       'Edit user settings'),
  -- Integrations
  ('integrations:view',   'integrations', 'view',   'all', 'View integrations'),
  ('integrations:create', 'integrations', 'create', 'all', 'Create integrations'),
  ('integrations:edit',   'integrations', 'edit',   'all', 'Edit integrations'),
  -- Notifications
  ('notifications:view',  'notifications', 'view', 'own',  'View notifications'),
  -- Audit Logs
  ('audit_logs:view',   'audit_logs', 'view',   'own',    'View audit logs'),
  ('audit_logs:export', 'audit_logs', 'export', 'own',    'Export audit logs'),
  -- Analytics
  ('analytics:view',   'analytics', 'view', 'own',       'View analytics'),
  -- Dashboards
  ('dashboards:view',   'dashboards', 'view',   'own',    'View dashboards'),
  ('dashboards:create', 'dashboards', 'create', 'own',    'Create dashboards/reports'),
  ('dashboards:edit',   'dashboards', 'edit',   'own',    'Edit dashboards/reports'),
  ('dashboards:delete', 'dashboards', 'delete', 'own',    'Delete dashboards/reports'),
  -- Billing
  ('billing:view',     'billing', 'view',   'all',        'View billing information'),
  ('billing:create',   'billing', 'create', 'all',        'Create billing entries'),
  ('billing:edit',     'billing', 'edit',   'all',        'Edit billing entries'),
  ('billing:delete',   'billing', 'delete', 'all',        'Delete billing entries'),
  ('billing:export',   'billing', 'export', 'all',        'Export billing data'),
  -- Platform Settings
  ('platform_settings:view', 'platform_settings', 'view', 'all', 'View platform settings'),
  ('platform_settings:edit', 'platform_settings', 'edit', 'all', 'Edit platform settings')
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
-- Assign ALL permissions to Platform Superadmin
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM rbac_permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- Assign permissions to Project Owner
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id
FROM rbac_permissions
WHERE name IN (
  -- Projects: own scope
  'projects:view', 'projects:edit', 'projects:archive', 'projects:restore',
  'projects:share', 'projects:import', 'projects:export',
  -- Tasks: project scope
  'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
  -- Time entries
  'time_entries:view', 'time_entries:perform', 'time_entries:export',
  -- Notes, messages, comments: project scope
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'messages:view', 'messages:create', 'messages:edit', 'messages:delete', 'messages:send',
  'comments:view', 'comments:create', 'comments:edit',
  -- Analytics, dashboards, audit logs: project scope
  'analytics:view', 'dashboards:view', 'dashboards:create', 'dashboards:edit', 'dashboards:delete',
  'audit_logs:view', 'audit_logs:export',
  -- Notifications: own
  'notifications:view',
  -- Settings: own
  'settings:view', 'settings:edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- Assign permissions to Project Collaborator
-- ============================================================

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id
FROM rbac_permissions
WHERE name IN (
  -- Projects: own scope (view only)
  'projects:view',
  -- Tasks: project scope
  'tasks:view', 'tasks:create', 'tasks:edit',
  -- Time entries: own
  'time_entries:view', 'time_entries:perform',
  -- Notes, messages, comments: project scope
  'notes:view', 'notes:create', 'notes:edit', 'notes:delete',
  'messages:view', 'messages:create', 'messages:edit', 'messages:delete', 'messages:send',
  'comments:view', 'comments:create', 'comments:edit',
  -- Analytics, dashboards: own scope
  'analytics:view', 'dashboards:view', 'dashboards:create', 'dashboards:edit', 'dashboards:delete',
  'audit_logs:view',
  -- Notifications: own
  'notifications:view',
  -- Settings: own
  'settings:view', 'settings:edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
