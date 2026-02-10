import { supabase } from "@/integrations/supabase/client";

export type TimeEntryEventType = 
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'manual_edit'
  | 'duration_changed'
  | 'notes_changed'
  | 'project_changed'
  | 'task_changed'
  | 'status_changed'
  | 'auto_stopped'
  | 'auto_paused'
  | 'cancelled';

export interface TimeEntryEventDetails {
  previousValue?: any;
  newValue?: any;
  pauseDuration?: number;
  reason?: string;
  field?: string;
  [key: string]: any;
}

export interface TimeEntryEvent {
  id: string;
  time_entry_id: string;
  auth_user_id: string;
  event_type: TimeEntryEventType;
  event_timestamp: string;
  details: TimeEntryEventDetails | null;
  created_at: string;
}

export async function logTimeEntryEvent(
  timeEntryId: string,
  eventType: TimeEntryEventType,
  details?: TimeEntryEventDetails
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn('Cannot log time entry event: No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('time_entry_events')
      .insert({
        time_entry_id: timeEntryId,
        auth_user_id: session.user.id,
        event_type: eventType,
        event_timestamp: new Date().toISOString(),
        details: details || null
      });

    if (error) {
      console.error('Error logging time entry event:', error);
    } else {
      console.log(`📝 Time entry event logged: ${eventType}`, details);
    }
  } catch (err) {
    console.error('Error logging time entry event:', err);
  }
}

export async function fetchTimeEntryEvents(timeEntryId: string): Promise<TimeEntryEvent[]> {
  try {
    const { data, error } = await supabase
      .from('time_entry_events')
      .select('*')
      .eq('time_entry_id', timeEntryId)
      .order('event_timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching time entry events:', error);
      return [];
    }

    return (data || []) as TimeEntryEvent[];
  } catch (err) {
    console.error('Error fetching time entry events:', err);
    return [];
  }
}

export async function fetchAllRecentEvents(limit: number = 500): Promise<TimeEntryEvent[]> {
  try {
    const { data, error } = await supabase
      .from('time_entry_events')
      .select('*')
      .order('event_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent events:', error);
      return [];
    }

    return (data || []) as TimeEntryEvent[];
  } catch (err) {
    console.error('Error fetching recent events:', err);
    return [];
  }
}

export function formatEventType(eventType: TimeEntryEventType): string {
  const labels: Record<TimeEntryEventType, string> = {
    started: 'Timer Started',
    stopped: 'Timer Stopped',
    paused: 'Timer Paused',
    resumed: 'Timer Resumed',
    manual_edit: 'Manual Edit',
    duration_changed: 'Duration Changed',
    notes_changed: 'Notes Changed',
    project_changed: 'Project Changed',
    task_changed: 'Task Changed',
    status_changed: 'Status Changed',
    auto_stopped: 'Auto-Stopped',
    auto_paused: 'Auto-Paused (New Timer Started)',
    cancelled: 'Timer Cancelled'
  };
  return labels[eventType] || eventType;
}

export function getEventIcon(eventType: TimeEntryEventType): string {
  const icons: Record<TimeEntryEventType, string> = {
    started: '▶️',
    stopped: '⏹️',
    paused: '⏸️',
    resumed: '▶️',
    manual_edit: '✏️',
    duration_changed: '⏱️',
    notes_changed: '📝',
    project_changed: '📁',
    task_changed: '📋',
    status_changed: '🔄',
    auto_stopped: '⚠️',
    auto_paused: '⏸️',
    cancelled: '❌'
  };
  return icons[eventType] || '📌';
}
