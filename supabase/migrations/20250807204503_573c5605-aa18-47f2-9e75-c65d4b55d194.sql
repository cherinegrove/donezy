-- Insert default system roles
INSERT INTO public.system_roles (name, description, permissions) VALUES
  ('platform_admin', 'Full platform administrative access with ability to manage system roles and access all accounts', '{"cross_account_access": true, "manage_system_roles": true, "full_admin_access": true}'),
  ('support_admin', 'Support administrative access with read-only cross-account access for customer support', '{"cross_account_access": true, "read_only_support": true, "view_audit_logs": true}')
ON CONFLICT (name) DO NOTHING;