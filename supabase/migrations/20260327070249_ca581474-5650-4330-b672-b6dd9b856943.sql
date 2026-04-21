
-- Multi-tenant SaaS Admin Portal Schema

-- Tenant accounts table
CREATE TABLE public.tenant_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'cancelled', 'suspended')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
  subscription_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_end_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  account_limits JSONB NOT NULL DEFAULT '{"users": 5, "tasks": 1000, "storage_gb": 5}'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{"video_recording": false, "client_portal": true, "api_access": false, "custom_branding": false, "advanced_reporting": false}'::jsonb,
  internal_notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant users (users belonging to a tenant account)
CREATE TABLE public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.tenant_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant invoices
CREATE TABLE public.tenant_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.tenant_accounts(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin audit log for multi-tenant portal
CREATE TABLE public.tenant_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  account_id UUID REFERENCES public.tenant_accounts(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account activity timeline
CREATE TABLE public.tenant_account_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.tenant_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  admin_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tenant_accounts_status ON public.tenant_accounts(status);
CREATE INDEX idx_tenant_accounts_tier ON public.tenant_accounts(subscription_tier);
CREATE INDEX idx_tenant_users_account ON public.tenant_users(account_id);
CREATE INDEX idx_tenant_users_email ON public.tenant_users(email);
CREATE INDEX idx_tenant_invoices_account ON public.tenant_invoices(account_id);
CREATE INDEX idx_tenant_audit_log_admin ON public.tenant_audit_log(admin_user_id);
CREATE INDEX idx_tenant_audit_log_account ON public.tenant_audit_log(account_id);
CREATE INDEX idx_tenant_account_events_account ON public.tenant_account_events(account_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_tenant_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tenant_accounts_updated_at
  BEFORE UPDATE ON public.tenant_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_tenant_updated_at();

CREATE TRIGGER tenant_users_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.update_tenant_updated_at();

-- RLS policies
ALTER TABLE public.tenant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_account_events ENABLE ROW LEVEL SECURITY;

-- Only platform_admin and support_admin can access tenant tables
CREATE POLICY "Admin access tenant_accounts" ON public.tenant_accounts
  FOR ALL TO authenticated
  USING (public.has_system_role(auth.uid(), 'platform_admin') OR public.has_system_role(auth.uid(), 'support_admin'));

CREATE POLICY "Admin access tenant_users" ON public.tenant_users
  FOR ALL TO authenticated
  USING (public.has_system_role(auth.uid(), 'platform_admin') OR public.has_system_role(auth.uid(), 'support_admin'));

CREATE POLICY "Admin access tenant_invoices" ON public.tenant_invoices
  FOR ALL TO authenticated
  USING (public.has_system_role(auth.uid(), 'platform_admin') OR public.has_system_role(auth.uid(), 'support_admin'));

CREATE POLICY "Admin access tenant_audit_log" ON public.tenant_audit_log
  FOR ALL TO authenticated
  USING (public.has_system_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admin access tenant_account_events" ON public.tenant_account_events
  FOR ALL TO authenticated
  USING (public.has_system_role(auth.uid(), 'platform_admin') OR public.has_system_role(auth.uid(), 'support_admin'));
