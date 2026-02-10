// Timer System Rules
// ===================
// 
// RULE 1: Only ONE timer can be actively running at a time
//         - This timer has timer_status='active' in the database
//         - ALL timers are ALWAYS stored in the database (never local-only)
//
// RULE 2: When a new timer starts, the currently active timer is PAUSED
//         - The active timer's status is updated to 'paused' in the database
//         - The new timer becomes the active timer
//
// RULE 3: Paused timers remain in the database and can be resumed
//         - When resumed, they are updated to 'active' status (NOT deleted and recreated)
//         - The previously active timer (if any) is paused
//
// RULE 4: Users can have multiple paused timers
//         - There's no limit on paused timers
//         - Each tracks its own elapsed time via time_entry_events
//
// RULE 5: Stopping a timer marks it as 'completed' with an end_time
//         - The time entry is NEVER deleted from the database
//         - Users must explicitly decline/cancel a timer
//
// RULE 6: NO HARD DELETES - timers are NEVER deleted from the database
//         - Cancelled timers get timer_status='cancelled'
//         - This preserves the full audit trail for financial tracking
//         - Only users can explicitly cancel their own timers
//
// RULE 7: NO LOCAL-ONLY TIMERS
//         - Every timer must be persisted to the database immediately on creation
//         - localStorage is only used for legacy compatibility, not as primary storage

export const TIMER_RULES = {
  MAX_ACTIVE_TIMERS: 1,
  AUTO_PAUSE_ON_NEW: true,
  PERSIST_ALL_TIMERS_TO_DB: true,
  NEVER_HARD_DELETE: true,
  NO_LOCAL_ONLY_TIMERS: true,
} as const;

export const getTimerRuleSummary = () => {
  return `
Timer System Rules:
• Only 1 timer can run at a time (synced to backend)
• Starting a new timer pauses the current one
• ALL timers are saved to the database (no local-only timers)
• Paused timers persist in the database and can be resumed
• Resuming updates the existing DB entry (no delete+recreate)
• Timers are NEVER hard-deleted (soft-delete with 'cancelled' status)
• No limit on paused timers
  `.trim();
};
