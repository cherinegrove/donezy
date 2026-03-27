
export interface TenantAccount {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  status: 'active' | 'trial' | 'cancelled' | 'suspended';
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise';
  subscription_price: number;
  billing_cycle: 'monthly' | 'annual';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_end_date: string | null;
  next_billing_date: string | null;
  auto_renew: boolean;
  account_limits: {
    users: number;
    tasks: number;
    storage_gb: number;
  };
  feature_flags: {
    video_recording: boolean;
    client_portal: boolean;
    api_access: boolean;
    custom_branding: boolean;
    advanced_reporting: boolean;
  };
  internal_notes: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantInvoice {
  id: string;
  account_id: string;
  stripe_invoice_id: string | null;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoice_date: string;
  due_date: string | null;
  paid_date: string | null;
  invoice_number: string | null;
  created_at: string;
}

export interface TenantAuditLog {
  id: string;
  admin_user_id: string | null;
  action_type: string;
  account_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface TenantAccountEvent {
  id: string;
  account_id: string;
  event_type: string;
  description: string;
  details: Record<string, any>;
  admin_user_id: string | null;
  created_at: string;
}

export type AccountStatusFilter = 'all' | TenantAccount['status'];
export type TierFilter = 'all' | TenantAccount['subscription_tier'];
