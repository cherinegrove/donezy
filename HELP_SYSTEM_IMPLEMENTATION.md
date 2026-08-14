# Help System Implementation Instructions

## Quick Start: 3 Steps to Add Help to Your App

### Step 1: Set Up the Help System Files ✅ (ALREADY DONE)

The following files have been created:

- `src/utils/helpMapping.ts` - Article mappings
- `src/contexts/HelpContext.tsx` - Global help state
- `src/components/help/HelpButton.tsx` - Help dropdown button
- `src/components/help/ContextualHelp.tsx` - Inline help icons

### Step 2: Add HelpProvider to App Root

**File: `src/pages/Index.tsx`** (or your main app wrapper)

Find the root component and wrap it with HelpProvider:

```tsx
// Add import at top
import { HelpProvider } from '@/contexts/HelpContext';

// Current structure (example):
export default function App() {
  return (
    <ThemeProvider>
      <AppContext.Provider value={{ /* ... */ }}>
        {/* App content */}
      </AppContext.Provider>
    </ThemeProvider>
  );
}

// NEW structure:
export default function App() {
  return (
    <HelpProvider>
      <ThemeProvider>
        <AppContext.Provider value={{ /* ... */ }}>
          {/* App content */}
        </AppContext.Provider>
      </ThemeProvider>
    </HelpProvider>
  );
}
```

### Step 3: Add HelpButton to TopBar

**File: `src/components/layout/TopBar.tsx`**

1. **Add import** at the top (around line 12):
```tsx
import { HelpButton } from '@/components/help/HelpButton';
```

2. **Find the section** with notification icons (around line 90-100):
```tsx
{/* Notifications */}
<NotificationsPopover />
```

3. **Add HelpButton right after** (insert this code):
```tsx
{/* Help */}
<HelpButton />
```

Complete example of the modified section:

```tsx
{/* Notifications */}
<NotificationsPopover />

{/* Help Button */}
<HelpButton />

{/* Timer Box Toggle */}
<div className="relative">
  {/* ... rest of code ... */}
</div>
```

## That's It! 🎉

You now have a fully functional help system integrated into Donezy.

## What Users Can Do

### From the Help Button
- Click the help icon (?) in the top right
- See relevant articles for their current page
- Browse the full knowledge base
- Access FAQ and troubleshooting
- Get keyboard shortcuts reference
- Contact support

### From Contextual Help Icons (Optional - Add Later)
- Hover over inline help icons next to form fields
- Click to open detailed article
- Learn about specific features

## Testing the Integration

### Test 1: Help Button Appears
1. Run the app
2. Look for help icon (?) in top navigation bar
3. Should be visible on all pages

### Test 2: Help Button Works
1. Click the help icon
2. Menu should drop down
3. Click "Browse Knowledge Base"
4. New tab opens with KB
5. Verify links work

### Test 3: Relevant Articles Show
1. Go to Tasks page
2. Click help icon
3. Should show "Task Management" article
4. Go to Time Tracking
5. Should show "Time Tracking Basics" article

## Optional: Add Contextual Help Icons

To add help icons next to form fields:

**Example: Task Creation Form**

```tsx
import { ContextualHelp } from '@/components/help/ContextualHelp';

export function CreateTaskForm() {
  return (
    <form>
      <div className="space-y-4">
        {/* Task Title Field */}
        <div>
          <label className="flex items-center gap-2">
            <span>Task Title</span>
            <ContextualHelp 
              articleKey="create-task"
              tooltip="A clear, specific title helps your team understand the task"
              size="sm"
            />
          </label>
          <Input placeholder="Enter task title" />
        </div>

        {/* Priority Field */}
        <div>
          <label className="flex items-center gap-2">
            <span>Priority</span>
            <ContextualHelp 
              articleKey="task-management"
              tooltip="Set priority to help your team focus on important tasks"
              size="sm"
            />
          </label>
          <Select>
            {/* options */}
          </Select>
        </div>

        {/* Estimated Hours */}
        <div>
          <label className="flex items-center gap-2">
            <span>Estimate (Hours)</span>
            <ContextualHelp 
              articleKey="task-management"
              tooltip="How long do you think this will take?"
              size="sm"
            />
          </label>
          <Input type="number" />
        </div>
      </div>
    </form>
  );
}
```

## Adding More Help Icons

### To Time Tracking
```tsx
import { ContextualHelp } from '@/components/help/ContextualHelp';

// In timer component
<div className="flex items-center justify-between">
  <h3>Active Timer</h3>
  <ContextualHelp 
    articleKey="time-tracking"
    tooltip="Track time to measure productivity and bill clients"
    size="sm"
  />
</div>
```

### To Projects
```tsx
import { ContextualHelp } from '@/components/help/ContextualHelp';

// In project creation/editing
<div>
  <label className="flex items-center gap-2">
    <span>Project Name</span>
    <ContextualHelp 
      articleKey="create-project"
      tooltip="A clear project name helps your team understand the scope"
      size="sm"
    />
  </label>
  <Input />
</div>
```

### To Settings
```tsx
import { ContextualHelp } from '@/components/help/ContextualHelp';

// In notification settings
<div className="flex items-center justify-between">
  <label>Email Notifications</label>
  <ContextualHelp 
    articleKey="notification-preferences"
    tooltip="Control which events send you email notifications"
    size="sm"
  />
</div>
```

## Updating KB URL

When you deploy the Knowledge Base:

1. Open `src/utils/helpMapping.ts`
2. Change line 3:
   ```ts
   // Current:
   export const KNOWLEDGE_BASE_URL = 'https://docs.donezy.io';
   
   // Change to your actual URL:
   export const KNOWLEDGE_BASE_URL = 'https://your-kb-url.com';
   ```

## Implementation Timeline

### Phase 1: Immediate (Today) ✅
- ✅ Help system files created
- ✅ Ready to integrate

### Phase 2: Quick Deploy (1-2 hours)
- Add HelpProvider to app root (10 min)
- Add HelpButton to TopBar (5 min)
- Test (15 min)
- Deploy (10 min)

### Phase 3: Enhance (Next few days)
- Add contextual help icons to key forms (2-3 hours)
- Add page context switching (1 hour)
- Test thoroughly (1 hour)

### Phase 4: Expand (Ongoing)
- Add more help icons to complex features
- Monitor which articles are most viewed
- Expand KB based on user feedback

## Troubleshooting

### Help Button Not Showing
**Problem**: Icon doesn't appear in top navigation

**Solutions**:
1. Verify `HelpProvider` wraps entire app
2. Check imports are correct
3. Clear browser cache
4. Check CSS/styling isn't hiding it
5. Look at console for errors

### Articles Not Opening
**Problem**: Clicking article link does nothing

**Solutions**:
1. Check `KNOWLEDGE_BASE_URL` is correct
2. Verify article URL in mapping
3. Check browser popup blockers
4. Test URL directly in browser

### Wrong Articles Showing
**Problem**: Help button shows unrelated articles

**Solutions**:
1. Make sure `setCurrentPage()` is called when page loads
2. Verify page key matches mapping in `helpMapping.ts`
3. Check article keys are spelled correctly

### Dropdown Menu Issues
**Problem**: Help menu doesn't appear or is cut off

**Solutions**:
1. Check z-index in CSS (should be high)
2. Verify parent divs don't have overflow:hidden
3. Check viewport size on mobile
4. Test in different browsers

## FAQ

**Q: Do I need to deploy the KB first?**
A: No, the help system works with the current KB URL. You can update it later.

**Q: Can I customize the help menu?**
A: Yes! Edit `HelpButton.tsx` to change layout, colors, order, etc.

**Q: How do I add new articles?**
A: Add to KB, then add mapping in `helpMapping.ts`.

**Q: Can users turn off help?**
A: Currently no, but you can add a toggle in settings if needed.

**Q: Does this work on mobile?**
A: Yes! Help button works on all devices.

**Q: How do I track which articles are viewed?**
A: Add analytics to KB (Google Analytics, Mixpanel, etc.)

## Files Reference

| File | Purpose | Location |
|------|---------|----------|
| helpMapping.ts | Article mappings | `src/utils/` |
| HelpContext.tsx | Global state | `src/contexts/` |
| HelpButton.tsx | Dropdown button | `src/components/help/` |
| ContextualHelp.tsx | Inline icons | `src/components/help/` |
| TopBar.tsx | Where to add button | `src/components/layout/` |

## Next Steps

1. **Immediate** (Today)
   - [ ] Add HelpProvider to app root
   - [ ] Add HelpButton to TopBar
   - [ ] Test integration

2. **Short-term** (This week)
   - [ ] Deploy knowledge base to public URL
   - [ ] Update KB_URL in helpMapping.ts
   - [ ] Test all links

3. **Medium-term** (Next week)
   - [ ] Add contextual help icons
   - [ ] Train support team
   - [ ] Announce KB to users

4. **Long-term** (Ongoing)
   - [ ] Monitor analytics
   - [ ] Expand KB articles
   - [ ] Add video tutorials

## Support

Need help implementing?

1. Review `INTEGRATION_GUIDE.md` for detailed examples
2. Check `HelpButton.tsx` for full implementation
3. See `helpMapping.ts` for article structure
4. Reference `HelpContext.tsx` for state management

---

**Status: Ready to Implement! 🚀**

Follow the 3 steps above to have a working help system in less than 1 hour.
