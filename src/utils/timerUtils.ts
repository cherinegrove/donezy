// Timer System Rules
// ===================
// 
// RULE 1: Only ONE timer can be actively running at a time (the "backend timer")
//         - This timer is synced to the database via activeTimeEntry in AppContext
//         - All other timers are "local-only" and tracked only in the browser
//
// RULE 2: When a new timer starts, the currently active timer is PAUSED
//         - The active timer is converted to a local-only paused timer
//         - The new timer becomes the active backend timer
//
// RULE 3: Paused timers remain visible and can be resumed
//         - When resumed, they become the new active backend timer
//         - The previously active timer (if any) is paused
//
// RULE 4: Users can have multiple paused timers
//         - There's no limit on paused timers
//         - Each tracks its own elapsed time and paused duration
//
// RULE 5: Stopping a timer removes it from the list
//         - The time is saved to the database
//         - The timer is deleted from local storage

export const TIMER_RULES = {
  MAX_ACTIVE_TIMERS: 1,
  AUTO_PAUSE_ON_NEW: true,
  PERSIST_PAUSED_TIMERS: true,
} as const;

export const getTimerRuleSummary = () => {
  return `
Timer System Rules:
• Only 1 timer can run at a time (synced to backend)
• Starting a new timer pauses the current one
• Paused timers remain visible and can be resumed
• Resuming a timer pauses the currently active one
• No limit on paused timers
  `.trim();
};
