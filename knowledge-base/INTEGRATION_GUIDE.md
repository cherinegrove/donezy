# Knowledge Base Integration Guide

This guide explains how the Donezy app integrates with the Knowledge Base to provide contextual help.

## Overview

The integration includes:

1. **HelpContext** - Global help state management
2. **HelpButton** - Help dropdown in top navigation bar
3. **ContextualHelp** - Inline help icons throughout the app
4. **helpMapping** - Mapping of pages to KB articles
5. **Keyboard shortcuts** - Quick access to help (Cmd+?)

## Architecture

### Files Created

```
src/
├── utils/
│   └── helpMapping.ts          # Article mappings
├── contexts/
│   └── HelpContext.tsx         # Global help state
└── components/help/
    ├── HelpButton.tsx          # Help dropdown button
    └── ContextualHelp.tsx      # Inline help icons
```

### How It Works

```
User clicks help icon
    ↓
HelpButton dropdown opens
    ↓
Shows relevant articles for current page
    ↓
User clicks article link
    ↓
Opens KB article in new tab
```

## Implementation Steps

### Step 1: Add HelpProvider to App Root

In `src/pages/Index.tsx` or main app wrapper:

```tsx
import { HelpProvider } from '@/contexts/HelpContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function App() {
  return (
    <HelpProvider>
      <ThemeProvider>
        {/* Rest of app */}
      </ThemeProvider>
    </HelpProvider>
  );
}
```

### Step 2: Add HelpButton to TopBar

In `src/components/layout/TopBar.tsx`, add HelpButton:

```tsx
import { HelpButton } from '@/components/help/HelpButton';

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Existing content */}
        
        {/* Add before user menu */}
        <div className="flex items-center gap-1">
          <HelpButton />
          {/* User menu continues */}
        </div>
      </div>
    </header>
  );
}
```

### Step 3: Add ContextualHelp Icons

Add help icons next to important features:

**Example 1: Task Creation**
```tsx
import { ContextualHelp } from '@/components/help/ContextualHelp';

export function CreateTaskForm() {
  return (
    <div>
      <label>
        <span>Task Title</span>
        <ContextualHelp 
          articleKey="create-task"
          tooltip="A clear, specific task title helps your team understand what needs to be done"
          size="sm"
        />
      </label>
      {/* form content */}
    </div>
  );
}
```

**Example 2: Time Tracking**
```tsx
export function TimerComponent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>Active Timer</h3>
        <ContextualHelp 
          articleKey="time-tracking"
          tooltip="Track time to measure productivity and bill clients"
          size="sm"
        />
      </div>
      {/* timer content */}
    </div>
  );
}
```

### Step 4: Update Page Context When Navigating

In page components, set the current page:

```tsx
import { useHelp } from '@/contexts/HelpContext';

export function TasksPage() {
  const { setCurrentPage } = useHelp();

  useEffect(() => {
    setCurrentPage('task-management');
  }, []);

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

## Article Mapping

All articles are mapped in `src/utils/helpMapping.ts`:

```ts
export const helpArticleMap: Record<string, HelpArticle> = {
  'create-task': {
    title: 'Creating Tasks',
    url: 'https://docs.donezy.io/tasks-projects/01-creating-tasks',
    description: 'Learn how to create tasks',
    section: 'Tasks & Projects'
  },
  // ... more mappings
};
```

### Adding New Article Mappings

1. Add article to Knowledge Base
2. Update `helpMapping.ts`:

```ts
export const helpArticleMap: Record<string, HelpArticle> = {
  // ... existing articles
  'my-new-article': {
    title: 'My New Article Title',
    url: 'https://docs.donezy.io/section/article-slug',
    description: 'Brief description',
    section: 'Section Name'
  },
};
```

3. Use in app:

```tsx
<ContextualHelp articleKey="my-new-article" />
// or
<HelpButton /> // automatically shows relevant articles
```

## Keyboard Shortcuts

Add keyboard shortcut for help (Cmd+? or Ctrl+?):

```tsx
// In a hook or effect
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
      // Open help
      toggleHelp();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

## Usage Examples

### Help Button in Navigation
```tsx
// Top bar automatically shows help button
<TopBar />
```

### Inline Help Icon
```tsx
<div className="flex items-center gap-2">
  <label>Task Priority</label>
  <ContextualHelp 
    articleKey="task-management"
    tooltip="Set priority to help your team focus on important tasks"
    size="sm"
  />
</div>
```

### Help for Form Field
```tsx
<div className="space-y-2">
  <label className="flex items-center gap-2">
    <span>Due Date</span>
    <ContextualHelp 
      articleKey="create-task"
      tooltip="When do you want this task completed?"
      size="sm"
    />
  </label>
  <Input type="date" />
</div>
```

### Dynamic Help Based on Page
```tsx
useEffect(() => {
  // Set contextual help when page changes
  if (location.pathname.includes('/tasks')) {
    setCurrentPage('task-management');
  } else if (location.pathname.includes('/time-tracking')) {
    setCurrentPage('time-tracking');
  }
}, [location]);
```

## Features

### Help Button Features

✅ Shows relevant articles for current page
✅ One-click access to full KB
✅ Quick links to popular articles
✅ Email support link
✅ Keyboard shortcut (Cmd+?)
✅ Dropdown menu for easy navigation

### ContextualHelp Features

✅ Inline help icons next to form fields
✅ Tooltip on hover showing article title
✅ Click to open article in new tab
✅ Multiple sizes (sm, md, lg)
✅ Configurable tooltip text
✅ Accessible (sr-only labels)

## Best Practices

### Where to Add Help Icons

✅ **Do add** next to:
- Complex form fields (Time estimate, Custom fields)
- Important features (Task priority, Billable toggle)
- Settings that need explanation
- Features users might not understand

❌ **Don't add** to:
- Simple labels (Task title, Description)
- Self-explanatory buttons
- Common interface elements
- Everything (avoid help icon overload)

### Writing Tooltips

✅ **Good tooltips:**
- "Track time to measure productivity and bill clients"
- "Set priority to help your team focus on important tasks"
- "Add context so your team understands what needs to be done"

❌ **Bad tooltips:**
- "Click for help"
- "This is a field"
- "Information"

### Article Keys

Use consistent, descriptive keys:
✅ `'time-tracking'`, `'create-task'`, `'keyboard-shortcuts'`
❌ `'article1'`, `'help'`, `'item'`

## Configuration

### Update KB URL

In `src/utils/helpMapping.ts`:

```ts
export const KNOWLEDGE_BASE_URL = 'https://your-kb-domain.com';
```

### Customize Article Mappings

Add/remove articles in `helpArticleMap`:

```ts
// Remove if not applicable
'article-key-to-remove': { /* ... */ }

// Add new article
'new-feature': {
  title: 'New Feature',
  url: 'https://your-kb.com/article',
  description: 'Description',
  section: 'Section'
}
```

### Change Help Button Position

In `TopBar.tsx`, move `<HelpButton />` to different location in the header.

### Customize Help Dropdown

Modify `HelpButton.tsx` to change:
- Menu alignment
- Menu width
- Article display format
- Quick links

## Testing

### Test Help Button
1. Click help icon in top navigation
2. Verify dropdown appears
3. Click an article link
4. Verify new tab opens with KB article

### Test Contextual Help
1. Hover over help icon
2. Verify tooltip appears
3. Click help icon
4. Verify new tab opens with article

### Test Page-Specific Help
1. Navigate to different page
2. Click help button
3. Verify articles shown are relevant

## Troubleshooting

### Articles Not Opening
- Check `KNOWLEDGE_BASE_URL` is correct
- Verify article URL in mapping is valid
- Check browser popup blockers

### Help Button Not Showing
- Verify `HelpProvider` wraps app
- Check `HelpButton` imported in TopBar
- Check CSS/styling isn't hiding button

### Wrong Articles Showing
- Verify `setCurrentPage()` called on page
- Check page key matches article mapping
- Check article keys are correct

## Integration Checklist

- [ ] Create Knowledge Base (completed ✅)
- [ ] Create help system files (completed ✅)
- [ ] Add HelpProvider to app root
- [ ] Add HelpButton to TopBar
- [ ] Add ContextualHelp icons to key pages
- [ ] Update article mappings
- [ ] Test all help links
- [ ] Test on mobile
- [ ] Add keyboard shortcuts
- [ ] Train support team on KB
- [ ] Announce KB to users

## Next Steps

1. **Immediate**: Deploy KB to public URL
2. **Short-term**: Integrate help system into app (2-4 hours)
3. **Medium-term**: Add help icons throughout app (3-5 hours)
4. **Long-term**: Expand KB articles based on support tickets

## Support

For questions about integration:
- Review this guide again
- Check example implementations
- Reference `helpMapping.ts` for structure
- See `HelpButton.tsx` for full example

---

**Integration Status: READY TO IMPLEMENT ✅**

All files created and documented. Ready for deployment!
