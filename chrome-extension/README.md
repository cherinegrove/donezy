# Donezy Chrome Extension

A Chrome extension for your Donezy project management app that allows you to:
- Start and stop timers
- Create tasks quickly from any webpage
- Access your projects and assign tasks

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The Donezy extension icon should appear in your toolbar

## Features

### Timer
- Start/stop timers that sync with your Donezy app
- View elapsed time in real-time
- Automatically creates time entries in your database

### Quick Task Creation
- Create tasks from any webpage
- Auto-populate task title from current tab
- Select project and priority
- Right-click on selected text to create task from selection

### Authentication
- Secure login using your Donezy credentials
- Session management with automatic persistence

## Usage

1. Click the Donezy icon in your Chrome toolbar
2. Login with your Donezy credentials
3. Use the timer to track work time
4. Create tasks quickly without switching tabs

## Development

The extension uses:
- Manifest V3 for modern Chrome extension standards
- Direct Supabase API integration
- Local storage for session management
- Chrome APIs for tab interaction and context menus

## Files Structure

- `manifest.json` - Extension configuration
- `popup.html` - Main popup interface
- `popup.js` - Popup functionality and API calls
- `background.js` - Background service worker
- `icons/` - Extension icons (you'll need to add these)

## Security

- API keys are included for the Supabase anon key (safe for client-side)
- User sessions are stored locally and encrypted by Chrome
- All API calls use proper authentication headers

## Customization

You can customize the extension by:
- Modifying the UI in `popup.html` and CSS
- Adding new features in `popup.js`
- Extending background functionality in `background.js`