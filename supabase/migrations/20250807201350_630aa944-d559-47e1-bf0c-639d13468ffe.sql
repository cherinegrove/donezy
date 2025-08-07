-- Create system roles for platform-level access control
-- This enables support admins to access any account while maintaining security

-- System roles enum (support_admin, platform_admin)
CREATE TYPE public.system_role_type AS ENUM ('support_admin', 'platform_admin');

-- System roles table
CREATE TABLE public.system_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name system_role_type NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User system roles junction table
CREATE TABLE public.user_system_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_role_id uuid NOT NULL REFERENCES public.system_roles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, system_role_id)
);

-- Support activity audit log
CREATE TABLE public.support_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  support_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_audit_log ENABLE ROW LEVEL SECURITY;

-- Insert default system roles
INSERT INTO public.system_roles (name, description, permissions) VALUES 
('platform_admin', 'Full platform administration access', '{"canManageSystemRoles": true, "canAccessAllAccounts": true, "canViewAuditLogs": true}'),
('support_admin', 'Support access to help users', '{"canAccessAllAccounts": true, "canViewUserData": true, "canViewAuditLogs": false}');

-- Security definer function to check if user has system role
CREATE OR REPLACE FUNCTION public.has_system_role(_user_id uuid, _role system_role_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_system_roles usr
    JOIN public.system_roles sr ON usr.system_role_id = sr.id
    WHERE usr.user_id = _user_id 
    AND sr.name = _role
  )
$$;

-- Function to check if user can assign system roles (platform admin only)
CREATE OR REPLACE FUNCTION public.can_assign_system_roles(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_system_role(_user_id, 'platform_admin')
$$;

-- RLS Policies for system_roles
CREATE POLICY "Platform admins can manage system roles"
ON public.system_roles
FOR ALL
USING (public.has_system_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_system_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System admins can view system roles"
ON public.system_roles
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- RLS Policies for user_system_roles
CREATE POLICY "Platform admins can manage user system roles"
ON public.user_system_roles
FOR ALL
USING (public.can_assign_system_roles(auth.uid()))
WITH CHECK (public.can_assign_system_roles(auth.uid()));

CREATE POLICY "Users can view their own system roles"
ON public.user_system_roles
FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for support_audit_log
CREATE POLICY "Platform admins can view all audit logs"
ON public.support_audit_log
FOR SELECT
USING (public.has_system_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Support users can view their own audit logs"
ON public.support_audit_log
FOR SELECT
USING (support_user_id = auth.uid());

CREATE POLICY "System users can insert audit logs"
ON public.support_audit_log
FOR INSERT
WITH CHECK (
  support_user_id = auth.uid() AND (
    public.has_system_role(auth.uid(), 'platform_admin') OR 
    public.has_system_role(auth.uid(), 'support_admin')
  )
);

-- Update existing table policies to allow system role access
-- Update users table policy
CREATE POLICY "System admins can view all users across accounts"
ON public.users
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- Update projects table policy
CREATE POLICY "System admins can view all projects across accounts"
ON public.projects
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- Update tasks table policy
CREATE POLICY "System admins can view all tasks across accounts"
ON public.tasks
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- Update clients table policy
CREATE POLICY "System admins can view all clients across accounts"
ON public.clients
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- Update messages table policy
CREATE POLICY "System admins can view all messages across accounts"
ON public.messages
FOR SELECT
USING (
  public.has_system_role(auth.uid(), 'platform_admin') OR 
  public.has_system_role(auth.uid(), 'support_admin')
);

-- Function to log support actions
CREATE OR REPLACE FUNCTION public.log_support_action(
  _action text,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}',
  _ip_address inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.support_audit_log (
    support_user_id,
    target_user_id,
    action,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    _target_user_id,
    _action,
    _details,
    _ip_address
  );
END;
$$;