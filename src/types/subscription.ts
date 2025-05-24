
import { User } from './index';

export interface AccountSubscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'paid';
  max_users: number;
  max_guests: number;
  additional_guests: number;
  monthly_cost: number;
  stripe_subscription_id?: string;
  status: 'active' | 'cancelled' | 'past_due';
  created_at: string;
  updated_at: string;
}

export interface AccountLimits {
  max_users: number;
  max_guests: number;
  current_users: number;
  current_guests: number;
  can_add_user: boolean;
  can_add_guest: boolean;
}

export interface GuestUser extends User {
  is_guest: boolean;
  guest_of_user_id?: string;
  guest_permissions: {
    canViewProjects?: boolean;
    canViewTasks?: boolean;
    canEditTasks?: boolean;
    canViewClients?: boolean;
    canViewReports?: boolean;
  };
}
