# Chrome Extension Guide

The Donezy Chrome extension brings task and time management directly to your browser, so you can track time and create tasks without leaving your work.

## Installing the Extension

### Step-by-Step Installation

1. Go to Chrome Web Store and search "Donezy"
2. Click "Add to Chrome"
3. Click "Add extension" in the confirmation popup
4. The Donezy icon will appear in your Chrome toolbar
5. Click the icon and sign in with your Donezy account

### Permissions Explanation

The extension requests:
- **Active tab**: To know which website you're working on
- **Scripting**: To inject features into web pages
- **Storage**: To save your session and preferences
- **Background service worker**: To track time in the background

These permissions are necessary for the extension to work but are used only within the Donezy extension.

## Getting Started

### First Time Setup

1. Click the Donezy extension icon
2. Sign in with your email and password
3. Allow notifications (optional but recommended)
4. Grant permissions when prompted

The extension will load your projects and tasks.

## Core Features

### Starting a Timer

**Quick Timer from Popup:**
1. Click the Donezy icon
2. Select a project from the dropdown
3. Optionally select a task
4. Click "Start Timer"
5. Timer runs in background and shows in popup

**Multi-Tasking Rule:**
Only one timer can run at a time. Starting a new timer automatically stops the previous one.

### Stopping & Saving Time

1. Click the Donezy icon to open the popup
2. Click "Stop Timer"
3. Add notes about what you worked on (optional)
4. Review start and end times (editable)
5. Adjust times if needed
6. Click "Save"

### Manual Time Entry

Add time retroactively for work already completed:

1. Open the extension popup
2. Click the **Time** tab
3. Click "Add Manual Entry"
4. Select project and task
5. Enter hours or minutes
6. Set date and start time
7. Add notes
8. Click "Save"

## Task Management

### Creating Tasks

**From the Extension:**
1. Click the Donezy icon
2. Go to **Tasks** tab
3. Click "New Task"
4. Enter task title
5. Choose project
6. Set priority, due date (optional)
7. Click "Create Task"

**From Page Selection:**
1. Highlight text on any webpage
2. Right-click → "Create Donezy task from selection"
3. Extension opens with pre-filled title
4. Complete the form
5. Click "Create Task"

### Browsing Tasks

1. Open extension popup
2. Go to **Tasks** tab
3. Select a project filter (optional)
4. Browse your tasks
5. Click a task to see details
6. Start a timer for any task

### Task Filtering

Filter tasks by:
- Project
- Status (Open, In Progress, Done, etc.)
- Priority
- Assignee
- Due date

## Notes Feature

### Creating Notes

1. Click the Donezy icon
2. Go to **Notes** tab
3. Click "New Note"
4. Enter title and content
5. Choose project (optional)
6. Click "Create Note"

### Quick Notes

Save quick thoughts or links:
1. Click Donezy extension
2. Click Notes tab
3. Type your note
4. Click Save

Notes sync immediately to your Donezy account.

## Time Tracking Features

### Timer Display

The popup shows:
- Current elapsed time
- Project name
- Task name (if selected)
- Start time
- Notes

### Timer Accuracy

The extension:
- Tracks time even if popup is closed
- Continues in background
- Uses browser time (ensure it's correct)
- Syncs with Donezy servers

### Time Report

View your time tracking summary:
1. Open extension
2. Go to **Reports** (or Time tab)
3. See today's time entries
4. View hours by project
5. See total hours tracked

## Settings

### Extension Preferences

1. Click Donezy extension icon
2. Click the gear icon
3. Available options:
   - **Auto-start on tab change**: Automatically switches project when you switch tabs
   - **Show notifications**: Get browser notifications for events
   - **Dark mode**: Use dark theme
   - **Time format**: 12-hour or 24-hour

### Account Management

1. Click Donezy extension
2. Click gear icon → **Account**
3. View your:
   - Email
   - Organization
   - Current projects
4. Option to logout

### Project Synchronization

Projects sync automatically:
- Every time you open the extension
- When you create a new project in Donezy
- When someone adds you to a project
- Sync happens in seconds

## Advanced Features

### Quick Actions

Right-click context menu options:
- **Create task from selection**: Turn highlighted text into a task
- **Open in Donezy**: Open the Donezy app
- **Start timer**: Quick start timer for selected task

### Keyboard Shortcuts

- **Ctrl+Shift+D** (Cmd+Shift+D on Mac): Open Donezy extension
- **Ctrl+Shift+T** (Cmd+Shift+T on Mac): Start/stop timer

Customize shortcuts:
1. Open Chrome settings
2. Go to Extensions → Keyboard shortcuts
3. Find Donezy
4. Edit shortcut

### Session Management

The extension maintains your session:
- Login persists across browser sessions
- Session token auto-refreshes
- Secure token storage
- Auto-logout after extended inactivity

## Notifications

### Notification Types

Get notified about:
- Task assignments
- Due date reminders
- Comments mentioning you
- Timer reminders

### Enabling Notifications

1. Open extension
2. Click settings
3. Toggle "Show Notifications"
4. Grant browser notification permission

### Notification Actions

Click a notification to:
- Open the task
- View the message
- Start a timer

## Troubleshooting

### Extension Won't Load

**Solution:**
1. Click the Donezy icon
2. Click settings
3. Click "Reload Extension"
4. Or: Right-click extension icon → "Manage extension"

### Can't Login

**Solution:**
1. Check email and password
2. Ensure caps lock is off
3. Try "Forgot Password" on Donezy website
4. Clear extension cache: Settings → Storage → Clear Cache
5. Reinstall extension if needed

### Timer Not Running

**Solution:**
1. Check if "Paused" is shown
2. Ensure internet connection is active
3. Close and reopen extension
4. Reload browser tab

### Can't Find a Project

**Solution:**
1. Ensure you're added to the project in Donezy
2. Click "Sync Projects" in extension
3. Log out and log back in
4. Check notification preferences (not excluded)

### Tasks Not Showing

**Solution:**
1. Check project filter
2. Check status filter
3. Click refresh button
4. Ensure tasks exist in that project

### Notifications Not Working

**Solution:**
1. Enable notifications in extension settings
2. Check browser notification settings
3. Ensure notification permission is granted for Donezy
4. Test by clicking "Test Notification" in settings

## Privacy & Security

### Data Stored Locally

The extension stores:
- Your login session (encrypted)
- Recent projects list
- Timer state
- User preferences

### What's NOT Stored
- Your password
- Full task lists (loaded on demand)
- Any private/sensitive data

### Session Security

- Tokens refresh automatically
- Session expires after inactivity
- You can logout anytime
- All data sent over HTTPS

### Disabling the Extension

1. Right-click Donezy icon
2. Click "Remove from Chrome"
3. Confirm removal

Your data remains safe in Donezy (data not deleted).

## Performance

### Browser Impact

The extension:
- Uses minimal memory
- Doesn't slow down browsing
- Syncs data in background
- Lightweight popup interface

### Optimization Tips

- Update Chrome regularly
- Disable unused extensions
- Clear extension cache periodically
- Ensure good internet for syncing

## Updates

### Auto-Updates

The extension:
- Updates automatically via Chrome
- No user action needed
- Updates happen in background

### Checking Version

1. Right-click Donezy icon
2. Click "Manage extension"
3. See current version
4. Toggle "Developer mode" to see details

## FAQ

**Q: Does timer work if browser closes?**
A: No, timer stops when browser closes. Reopen and manually add the time.

**Q: Can I run multiple timers?**
A: No, only one timer at a time per account.

**Q: Does extension work incognito?**
A: Yes, but login persists only in that incognito session.

**Q: Is my data safe?**
A: Yes, all data encrypted, no passwords stored, uses HTTPS.

## Limitations

- Timer only tracks while browser is open
- Mobile browsers don't support extensions
- Requires Chrome or Chrome-based browser
- Limited offline functionality

## See Also
- [Time Tracking Basics](../time-tracking/01-time-tracking-basics.md)
- [Creating Tasks](../tasks-projects/01-creating-tasks.md)
- [Mobile App](./04-mobile-app.md)
