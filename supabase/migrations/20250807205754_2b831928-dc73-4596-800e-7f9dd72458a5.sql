-- Create organizations table for multi-tenancy
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    domain TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan TEXT DEFAULT 'free',
    max_users INTEGER DEFAULT 5,
    max_guests INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create user_organizations junction table
CREATE TABLE public.user_organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    invited_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS on user_organizations
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to existing tables
ALTER TABLE public.users ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.teams ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notes ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.time_entries ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.custom_roles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.custom_fields ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create indexes for performance
CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON public.user_organizations(organization_id);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_tasks_organization_id ON public.tasks(organization_id);

-- Create function to get user's current organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Create function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  );
$$;

-- RLS Policies for Organizations
CREATE POLICY "Platform admins can view all organizations" ON public.organizations
FOR SELECT TO authenticated
USING (has_system_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view their organizations" ON public.organizations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = id AND uo.user_id = auth.uid()
  )
);

CREATE POLICY "Platform admins can manage organizations" ON public.organizations
FOR ALL TO authenticated
USING (has_system_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_system_role(auth.uid(), 'platform_admin'));

-- RLS Policies for User Organizations
CREATE POLICY "Users can view their organization memberships" ON public.user_organizations
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all memberships" ON public.user_organizations
FOR SELECT TO authenticated
USING (has_system_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can manage memberships" ON public.user_organizations
FOR ALL TO authenticated
USING (has_system_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_system_role(auth.uid(), 'platform_admin'));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();