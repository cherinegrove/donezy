# ActiveTimersSection Implementation Summary

## Overview
This document outlines the implementation of two major features for the ActiveTimersSection component:

1. **Expandable Event Logs** - Display timer event history with expand/collapse functionality
2. **Edit Timer Before Save** - Allow users to adjust elapsed time via a dialog before saving

---

## Feature 1: Expandable Event Logs

### Implementation Details

**Files Modified:**
- `ActiveTimersSection.tsx` - Added event log UI and expand/collapse state

**Files Created:**
- No new files required (reuses existing `TimeEntryEventLog` component)

### How It Works

1. **State Management**
   - New state: `expandedTimerIds: Set<string>` - Tracks which timers have expanded event logs
   - Event logs only appear for DB-backed timers (not local-only timers)

2. **Permission Checking**
   - Only admin users or the timer owner can view event logs
   - Checked via `canViewLogs` variable using `isAdminUser()` or `isSuperAdmin`

3. **UI Components**
   - Toggle button with ChevronDown/ChevronUp icons
   - Uses existing `TimeEntryEventLog` component which displays:
     - Timeline visualization
     - Event type with icon (e.g., Started, Paused, Resumed)
     - Event timestamp
     - Pause duration details

4. **Visual Design**
   - Toggle button positioned below timer card
   - Event log displays in a bordered container with max-height and scrolling
   - Muted background to distinguish from main timer display
   - Smooth transitions with hover effects

### Usage Example
```typescript
const isExpanded = expandedTimerIds.has(timer.id);
const canViewLogs = !isOtherUserTimer || isAdminUser() || isSuperAdmin;

// Toggle expansion
onClick={() => {
  const newExpanded = new Set(expandedTimerIds);
  if (newExpanded.has(timer.id)) {
    newExpanded.delete(timer.id);
  } else {
    newExpanded.add(timer.id);
  }
  setExpandedTimerIds(newExpanded);
}}

// Display event log
{isExpanded && canViewLogs && <TimeEntryEventLog timeEntryId={timer.id} />}
```

---

## Feature 2: Edit Timer Before Save

### Implementation Details

**Files Created:**
- `EditTimerDialog.tsx` - New dialog component for adjusting timer duration

**Files Modified:**
- `ActiveTimersSection.tsx` - Integrated EditTimerDialog into save flow

### EditTimerDialog Component

**Props:**
```typescript
interface EditTimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustedElapsedMs: number, notes: string) => Promise<void>;
  taskTitle: string;
  originalElapsedMs: number;
  initialNotes?: string;
  isSaving?: boolean;
}
```

**Features:**
1. **Time Display**
   - Shows original calculated time in HH:MM:SS format
   - Displays adjusted time (if changed) in different color
   - Supports hours (0-999) and minutes (0-59) inputs

2. **Notes Support**
   - Optional textarea for adding work notes
   - Notes are passed to save flow

3. **UI/UX**
   - Clean dialog with Clock icon in header
   - Original vs. adjusted time comparison in muted background box
   - Input fields with clear labels
   - Save/Cancel buttons with loading state

### Integration into ActiveTimersSection

**Modified Save Flow:**

**Before (Old):**
```typescript
// Direct save without edit dialog
handleLocalTimerStop() → confirmLocalTimerStop()
```

**After (New):**
```typescript
// Opens edit dialog first
handleLocalTimerStop() → Opens EditTimerDialog
                       → User adjusts time/notes
                       → onConfirm() → confirmLocalTimerStop(adjustedElapsedMs, notes)
```

**State Changes:**
- New state: `editDialogOpen: boolean` - Controls dialog visibility
- New state: `isSavingTimer: boolean` - Tracks save operation
- `selectedLocalTimer` now holds the timer being edited

**Key Function Changes:**

1. **`handleLocalTimerStop(timer)`**
   - Now opens the edit dialog instead of save dialog
   - Sets the selected timer

2. **`calculateTimerElapsedMs(timer)`** - New utility function
   - Calculates actual elapsed time from events (for DB timers)
   - Handles both DB-backed and local-only timers
   - Accounts for pause/resume cycles

3. **`confirmLocalTimerStop(adjustedElapsedMs, finalNotes)`** - Modified
   - Now accepts adjusted elapsed time and notes from dialog
   - Uses adjusted time instead of calculating it
   - Maintains all existing save logic (DB vs. local storage)

### Time Calculation Details

**For DB-Backed Timers:**
- Fetches `time_entry_events` table
- Calculates total paused duration from pause/resume events
- Formula: `totalWallTime - totalPausedTime = actualElapsedTime`

**For Local Timers:**
- If paused: Uses stored `timer.elapsed` value
- If active: Calculates `now - startTime - totalPausedTime`

**For Adjusted Time:**
- User provides hours and minutes
- Converted to milliseconds: `(hours × 3600 + minutes × 60) × 1000`
- Passed to save function as final elapsed time

---

## Event Log Details

### Event Types Displayed
The `TimeEntryEventLog` component displays events from the `time_entry_events` table:

- `started` (▶️) - Timer started
- `paused` (⏸️) - Timer paused by user
- `resumed` (▶️) - Timer resumed from pause
- `auto_paused` (⏸️) - Auto-paused when another timer started
- `stopped` (⏹️) - Timer completed
- `cancelled` (❌) - Timer cancelled
- `manual_edit` (✏️) - Manual time adjustment
- `duration_changed` (⏱️) - Duration changed
- `notes_changed` (📝) - Notes updated

### Event Details Format
Each event shows:
- Event type with emoji icon
- Timestamp (MMM d, yyyy at h:mm:ss a)
- Details (if available):
  - Pause duration
  - Field changed
  - Previous/new values
  - Reason for event

---

## TypeScript Type Safety

All implementations maintain strict TypeScript typing:

```typescript
// EditTimerDialog proper typing
interface EditTimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustedElapsedMs: number, notes: string) => Promise<void>;
  taskTitle: string;
  originalElapsedMs: number;
  initialNotes?: string;
  isSaving?: boolean;
}

// State management with proper types
const [expandedTimerIds, setExpandedTimerIds] = useState<Set<string>>(new Set());
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [isSavingTimer, setIsSavingTimer] = useState(false);
```

---

## User Flows

### Flow 1: View Event Log
1. User clicks "Event Log" toggle below timer card
2. Expand/collapse animation occurs
3. TimeEntryEventLog component fetches and displays events
4. User can scroll through event history
5. Click again to collapse

### Flow 2: Save Timer with Adjusted Time
1. User clicks Save button on timer
2. EditTimerDialog opens showing:
   - Original calculated time
   - Hour and minute input fields
   - Optional notes textarea
3. User adjusts hours/minutes as needed
4. User optionally adds notes
5. User clicks "Save Time Entry"
6. Dialog shows loading state
7. Time entry is saved with adjusted duration
8. Dialog closes and timer is removed

### Flow 3: Cancel Save
1. User opens EditTimerDialog
2. User clicks "Cancel"
3. Dialog closes without saving
4. Timer remains active/paused

---

## Permissions & Security

### Event Log Viewing
- **Admin Users**: Can view logs for all timers
- **Super Admins**: Can view logs for all timers
- **Regular Users**: Can view logs for their own timers only
- **Other User's Timers**: Non-admins cannot view logs

```typescript
const canViewLogs = !isOtherUserTimer || isAdminUser() || isSuperAdmin;
```

### Save Permissions
- Any user can adjust and save their own timers
- Backend enforces ownership via userId check
- Supabase RLS policies should validate timer ownership on update

---

## Error Handling

1. **Event Fetching Errors**
   - Component handles gracefully with empty state
   - `TimeEntryEventLog` shows "No events recorded" message

2. **Save Errors**
   - `confirmLocalTimerStop` wrapped in try-catch
   - Errors logged to console
   - `isSavingTimer` state prevents duplicate submissions
   - User can retry after error

3. **Calculation Errors**
   - `calculateTimerElapsedMs` handles missing event data
   - Falls back to wall-clock time if event fetch fails
   - Ensures non-negative elapsed time with `Math.max(0, ...)`

---

## Performance Considerations

1. **Event Log Lazy Loading**
   - Events only fetched when user clicks expand
   - Not pre-loaded for all timers
   - Uses React's unmount cleanup to cancel pending requests

2. **Set Operations**
   - `expandedTimerIds` uses Set for O(1) lookups
   - Immutable updates with `new Set()` to avoid re-render issues

3. **Dialog State**
   - Single dialog instance shared across all timers
   - Only one timer can be edited at a time
   - Proper cleanup on dialog close

---

## Testing Checklist

- [ ] Can expand/collapse event logs for DB-backed timers
- [ ] Event logs show correct event history
- [ ] Event log toggle only appears for DB-backed timers
- [ ] Admin/super-admin can view all event logs
- [ ] Regular users can only view their own timer logs
- [ ] Event log shows loading state while fetching
- [ ] Event log shows "No events" message when empty
- [ ] Edit dialog opens on Save button click
- [ ] Original time displays correctly
- [ ] Adjusted time displays when changed
- [ ] Hours field accepts 0-999
- [ ] Minutes field accepts 0-59
- [ ] Notes textarea works properly
- [ ] Cancel closes dialog without saving
- [ ] Confirm saves with adjusted time
- [ ] Save shows loading state
- [ ] Time entry created/updated with adjusted duration
- [ ] Local-only timers work with new flow
- [ ] DB-backed timers work with new flow
- [ ] Paused timers save correctly
- [ ] Active timers save correctly

---

## Files Reference

### New Files Created
- `/src/components/time/EditTimerDialog.tsx` - Edit time before save dialog

### Files Modified
- `/src/components/time/ActiveTimersSection.tsx` - Added event logs and edit dialog integration

### Files Used (Existing)
- `/src/components/time/TimeEntryEventLog.tsx` - Event history display
- `/src/utils/timeEntryEventLogger.ts` - Event fetching utilities
- `/src/components/ui/dialog.tsx` - Dialog components
- `/src/components/ui/button.tsx` - Button components
- `/src/components/ui/input.tsx` - Input components
- `/src/components/ui/textarea.tsx` - Textarea component

---

## Future Enhancements

1. **Bulk Actions**
   - Select multiple timers and adjust time for all at once
   - Batch save operation

2. **Time Entry Preview**
   - Show how the adjusted time will affect time entry totals
   - Display billable vs. non-billable breakdown

3. **Smart Adjustments**
   - Auto-round to nearest 15-min increment (common billing practice)
   - Suggest common time amounts (0.5h, 1h, 1.5h, 2h, etc.)

4. **Event Log Enhancements**
   - Filter events by type (show only pauses, only edits, etc.)
   - Export event history
   - Timeline visualization with pause duration visualization

5. **Undo/Redo**
   - Store previous adjustments
   - Allow reverting to original time without re-entering dialog

---

## Integration Notes

- The EditTimerDialog follows Donezy's existing dialog patterns
- Event logs use the same styling as TimerBox component
- Both features respect role-based permissions system
- Time calculations match AppContext elapsed time logic
- All DB operations use existing Supabase client patterns
