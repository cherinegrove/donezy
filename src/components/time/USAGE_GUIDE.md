# Usage Guide: EditTimerDialog & Event Logs

## Quick Reference

### Using EditTimerDialog

Import the component:
```typescript
import { EditTimerDialog } from "@/components/time/EditTimerDialog";
```

Basic usage:
```typescript
<EditTimerDialog
  isOpen={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onConfirm={async (adjustedMs, notes) => {
    // Handle save with adjusted time in milliseconds
    await saveTimer(adjustedMs, notes);
  }}
  taskTitle="Design Homepage"
  originalElapsedMs={3600000} // 1 hour in ms
  initialNotes=""
  isSaving={false}
/>
```

**Props Breakdown:**
- `isOpen` - Whether dialog is visible
- `onClose` - Called when user clicks Cancel
- `onConfirm` - Called with adjusted time (ms) and notes when user clicks Save
- `taskTitle` - Task name to display in dialog
- `originalElapsedMs` - Original elapsed time in milliseconds
- `initialNotes` - Pre-filled notes (optional)
- `isSaving` - Shows loading state when true (optional)

### Time Format Handling

The dialog works with milliseconds internally:

```typescript
// Convert from milliseconds to hours/minutes for display
const totalMinutes = Math.floor(elapsedMs / (1000 * 60));
const hours = Math.floor(totalMinutes / 60);
const minutes = totalMinutes % 60;

// Convert back to milliseconds
const elapsedMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
```

### Using Event Logs

Event logs are automatically integrated when conditions are met:

```typescript
// Event logs appear when:
// 1. Timer is DB-backed (!timer.isLocalOnly)
// 2. User has permission (admin or timer owner)
// 3. User clicks toggle to expand

const canViewLogs = !isOtherUserTimer || isAdminUser() || isSuperAdmin;
```

To add event logging to a timer operation:

```typescript
import { logTimeEntryEvent, TimeEntryEventType } from "@/utils/timeEntryEventLogger";

// Log an event
await logTimeEntryEvent(
  timeEntryId,
  'duration_changed' as TimeEntryEventType,
  { 
    previousValue: 60,
    newValue: 90,
    field: 'duration_minutes'
  }
);
```

### Event Types Available

```typescript
type TimeEntryEventType = 
  | 'started'           // ▶️ Timer started
  | 'stopped'           // ⏹️ Timer stopped
  | 'paused'            // ⏸️ Paused by user
  | 'resumed'           // ▶️ Resumed by user
  | 'manual_edit'       // ✏️ Manual edit
  | 'duration_changed'  // ⏱️ Duration changed
  | 'notes_changed'     // 📝 Notes changed
  | 'project_changed'   // 📁 Project changed
  | 'task_changed'      // 📋 Task changed
  | 'status_changed'    // 🔄 Status changed
  | 'auto_stopped'      // ⚠️ Auto-stopped
  | 'auto_paused'       // ⏸️ Auto-paused
  | 'cancelled';        // ❌ Cancelled
```

## Common Patterns

### Pattern 1: Save Timer with Adjustment

```typescript
const handleSaveTimer = (timer: TimerItem) => {
  // Calculate original elapsed time
  const originalElapsed = timer.isPaused 
    ? timer.elapsed 
    : Date.now() - timer.startTime.getTime();
  
  // Open edit dialog
  setSelectedTimer(timer);
  setEditDialogOpen(true);
};

const handleConfirmSave = async (adjustedMs: number, notes: string) => {
  // Convert to minutes for storage
  const durationMinutes = Math.floor(adjustedMs / (1000 * 60));
  
  // Save to database
  await updateTimeEntry({
    duration: durationMinutes,
    notes: notes
  });
  
  // Log the change if time was adjusted
  if (adjustedMs !== originalElapsed) {
    await logTimeEntryEvent(timer.id, 'duration_changed', {
      previousValue: originalElapsed / 1000 / 60, // in minutes
      newValue: durationMinutes
    });
  }
};
```

### Pattern 2: Check User Permissions Before Showing Logs

```typescript
const canViewLogs = (timer: any, currentUser: any, isAdmin: boolean) => {
  // Admin always can view
  if (isAdmin) return true;
  
  // Owner can view their own
  if (timer.userId === currentUser.id) return true;
  
  return false;
};

// Usage
{canViewLogs(timer, currentUser, isAdminUser()) && (
  <button onClick={() => toggleExpanded(timer.id)}>
    View Event Log
  </button>
)}
```

### Pattern 3: Handle Save Errors Gracefully

```typescript
const confirmSave = async (adjustedMs: number, notes: string) => {
  setSaving(true);
  try {
    // Validate input
    if (adjustedMs < 60000) {
      toast.error("Duration must be at least 1 minute");
      return;
    }
    
    // Perform save
    await saveTimer(adjustedMs, notes);
    
    // Close dialog
    setEditDialogOpen(false);
    toast.success("Timer saved successfully");
  } catch (error) {
    console.error("Save failed:", error);
    toast.error("Failed to save timer. Please try again.");
  } finally {
    setSaving(false);
  }
};
```

## Component Integration in ActiveTimersSection

The features are already integrated. To use in other components:

### Add Import
```typescript
import { EditTimerDialog } from "@/components/time/EditTimerDialog";
import { TimeEntryEventLog } from "@/components/time/TimeEntryEventLog";
```

### Add State
```typescript
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [expandedTimerIds, setExpandedTimerIds] = useState<Set<string>>(new Set());
const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
```

### Add UI
```typescript
{/* Toggle Event Log */}
<button onClick={() => toggleExpanded(timer.id)}>
  {isExpanded ? "Hide" : "Show"} Event Log
</button>

{/* Event Log Display */}
{isExpanded && !timer.isLocalOnly && (
  <TimeEntryEventLog timeEntryId={timer.id} />
)}

{/* Edit Dialog */}
<EditTimerDialog
  isOpen={editDialogOpen}
  onClose={() => {
    setEditDialogOpen(false);
    setSelectedTimer(null);
  }}
  onConfirm={handleSaveTimer}
  taskTitle={selectedTimer?.taskTitle || ""}
  originalElapsedMs={calculateOriginalMs(selectedTimer)}
  isSaving={isSaving}
/>
```

## Debugging

### Check if Events are Being Logged

In Supabase dashboard:
1. Go to "time_entry_events" table
2. Filter by `time_entry_id = <your-timer-id>`
3. Verify events appear with correct types

### Common Issues

**Issue: Event log not showing**
- Check if timer is DB-backed (not isLocalOnly)
- Check user permissions (admin or timer owner)
- Check browser console for fetch errors
- Verify time_entry_id is correct

**Issue: Edit dialog not opening**
- Check if selectedLocalTimer is set
- Check if editDialogOpen state updates properly
- Verify onClose callback is defined
- Check browser console for errors

**Issue: Time not saving correctly**
- Verify adjustedMs is in milliseconds (not minutes)
- Check that duration is being divided by 60000 for minutes
- Verify database column accepts the duration value
- Check Supabase RLS policies allow update

## Testing

### Unit Test Example

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { EditTimerDialog } from "./EditTimerDialog";

test("displays original time", () => {
  const onConfirm = jest.fn();
  render(
    <EditTimerDialog
      isOpen={true}
      onClose={() => {}}
      onConfirm={onConfirm}
      taskTitle="Test Task"
      originalElapsedMs={3600000} // 1 hour
      isSaving={false}
    />
  );
  
  expect(screen.getByText(/01:00:00/)).toBeInTheDocument();
});

test("calls onConfirm with adjusted time", async () => {
  const onConfirm = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <EditTimerDialog
      isOpen={true}
      onClose={() => {}}
      onConfirm={onConfirm}
      taskTitle="Test Task"
      originalElapsedMs={3600000}
      isSaving={false}
    />
  );
  
  // Change hours to 2
  fireEvent.change(getByPlaceholderText("Hours"), { 
    target: { value: "2" } 
  });
  
  fireEvent.click(getByText("Save Time Entry"));
  
  expect(onConfirm).toHaveBeenCalledWith(
    7200000, // 2 hours in ms
    ""
  );
});
```

## Performance Tips

1. **Lazy Load Event Logs**
   - Events only fetched when user expands
   - Don't pre-load for all timers

2. **Use Set for Expanded IDs**
   - O(1) lookup performance
   - Proper immutability with `new Set()`

3. **Debounce Input Changes**
   - Consider debouncing if adding more complex calculations
   - Current inputs are simple (hours/minutes)

4. **Memoize Calculations**
   - Consider memoizing `canViewLogs` check if called frequently

## Accessibility

The components follow WCAG guidelines:

- Dialog has proper labels and ARIA roles
- Input fields have associated labels
- Button intents are clear
- Keyboard navigation supported
- Color contrast meets AA standards

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported (uses modern JavaScript)

## Related Documentation

- See `IMPLEMENTATION_SUMMARY.md` for architecture details
- See `TimeEntryEventLog.tsx` for event display component
- See `timeEntryEventLogger.ts` for event utilities
