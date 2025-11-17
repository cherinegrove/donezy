export interface RecurringTask {
  id: string;
  auth_user_id: string;
  title: string;
  description: string | null;
  project_id: string;
  assignee_id: string | null;
  priority: string;
  collaborator_ids: string[];
  estimated_hours: number | null;
  recurrence_pattern: string;
  recurrence_interval: number;
  days_of_week: number[] | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  next_generation_date: string;
  last_generated_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
