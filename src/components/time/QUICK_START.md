# Quick Start: New Timer Features

## What's New

### 1. Expandable Event Logs ✨
**What:** View the history of timer events (paused, resumed, edited, etc.)
**Where:** Click "Event Log" toggle below any database-backed timer
**Who Can See:** Admins (all timers) + Timer owners (their own timers)
**What Shows:** Timeline of events with timestamps and pause durations

### 2. Edit Timer Before Save 📝
**What:** Adjust the elapsed time before saving a timer entry
**When:** Click the Save button on any timer
**How:** Dialog opens with original time, you adjust hours/minutes and click Save
**Result:** Time entry saved with your adjusted duration

---

## Feature 1: Event Logs

### Where to Find It
```
Timer Card
├── Timer display (time, status, controls)
└── [Event Log] ← Click here
    └── Shows event history
```

### What You'll See
- **Timeline** - Visual line showing all events
- **Event Icons** - ▶️ Started, ⏸️ Paused, ▶️ Resumed, ⏹️ Stopped, etc.
- **Timestamps** - Exact time each event occurred
- **Details** - "Paused for 5m 30s" or other relevant info

### Permissions
- **You created the timer** → Can always see logs
- **Admin/Super Admin** → Can see all logs
- **Other users' timers** → Cannot see logs (unless admin)

---

## Feature 2: Edit Time Dialog

### Quick Flow
1. **Click Save button** on timer → Dialog opens
2. **Adjust time** using hour/minute inputs
3. **Add notes** (optional)
4. **Click Save Time Entry** → Timer is saved with adjusted time

### Time Input
- **Hours**: 0-999 (no limit)
- **Minutes**: 0-59 (automatically clamps)
- **Format shown**: HH:MM:SS in both original and adjusted

### Example
```
Original time: 01:15:00
You change: Hours = 1, Minutes = 30
New time: 01:30:00 ← Different from original!
Click Save → Entry saved with 1.5 hours
```

---

## What Gets Saved

### When You Adjust Time
- **Duration Minutes** - Calculated from hours + minutes (rounded to minutes)
- **Notes** - Any text you entered in the notes field
- **Status** - Set to 'completed'
- **Timestamp** - Current time when saved

### Example Values
| Original | Your Input | Saved As |
|----------|-----------|----------|
| 1:15:00 | 1h 30m | 90 minutes |
| 0:45:00 | 0h 50m | 50 minutes |
| 2:00:00 | 2h 0m | 120 minutes |
| 3:15:00 | 3h 15m | 195 minutes |

---

## Keyboard Shortcuts

**Edit Dialog:**
- `Escape` - Close dialog (same as Cancel)
- `Tab` - Navigate between fields
- `Enter` in notes field - Add newline (Shift+Enter in some fields to submit)

---

## Common Issues & Solutions

### "I don't see Event Log button"
**Cause:** Timer is local-only (not saved to database)  
**Solution:** Only database timers have event logs. This is normal.

### "I can't see other user's event logs"
**Cause:** You're not an admin  
**Solution:** Only admins and timer owners can view logs. Ask admin if needed.

### "The time didn't save with my adjustment"
**Cause:** Browser console may show error, or dialog didn't fully process  
**Solution:** 
1. Check browser console for errors
2. Wait for "Saving..." to complete
3. Close and reopen to verify save

### "My notes didn't save"
**Cause:** Notes field might have had focus when you clicked Save  
**Solution:** Click in a different field first, then click Save

---

## Tips & Tricks

### Rounding Times
The dialog accepts any hours/minutes combination:
- No automatic rounding to 15-minute increments
- You control exactly what gets saved
- Good for client billing accuracy

### Adding Context
Use the notes field to document:
- What you actually worked on
- Why the time differs from calculated
- Client/approval information
- Any blockers or delays

### Viewing Changes
After saving with an adjustment:
1. Check the Event Log
2. You'll see a `manual_edit` or `duration_changed` event
3. Shows what changed and when

### Batch Adjustments
If multiple timers need adjustment:
1. Save each one individually (no batch edit yet)
2. Use the same notes pattern for consistency
3. Check logs to verify all updates

---

## What Admins See Extra

### Full Event Access
- View event logs for **any timer** (not just own)
- See edit history across all users
- Identify patterns (frequent adjustments, etc.)

### Event Log Contains
- User who performed the action
- Exact timestamp of each event
- Previous → New values (if edited)
- Reason/context of changes

### Use Cases
- Audit trail for billing
- Track time entry accuracy
- Identify training needs
- Verify manual overrides

---

## Troubleshooting

### Still can't see Event Log?
- [ ] Is it a database timer? (Check if it has pause/resume buttons)
- [ ] Are you the timer owner or an admin?
- [ ] Try refreshing the page
- [ ] Check browser console for errors (F12)

### Edit dialog won't open?
- [ ] Make sure timer is not "Other User's" timer (if not admin)
- [ ] Try clicking Save button again
- [ ] Check if there's a network error (F12 Network tab)
- [ ] Try refreshing page

### Time saved incorrectly?
- [ ] Check the number you entered (0-59 for minutes)
- [ ] Verify it shows in the "Adjusted time" preview
- [ ] Check Event Log to see what was actually saved
- [ ] Contact admin if still wrong

---

## Next Steps

1. **Try the features** on your own timers
2. **View an event log** to understand the timeline
3. **Adjust a time** and verify it saved correctly
4. **Check the event log** after saving to see the record

---

## Need Help?

See detailed docs:
- `IMPLEMENTATION_SUMMARY.md` - Architecture & design
- `USAGE_GUIDE.md` - Code examples & patterns
- Browser console (F12) - Error messages

Ask your admin if you have questions about permissions or billing implications!
