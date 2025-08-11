// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Donezy Chrome Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically when manifest.json has action.default_popup
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({
        title: tabs[0]?.title,
        url: tabs[0]?.url
      });
    });
    return true;
  }
});

// Optional: Add context menu for quick task creation
chrome.contextMenus.create({
  id: 'createTaskFromSelection',
  title: 'Create Donezy task from selection',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'createTaskFromSelection') {
    // Store the selected text for use in popup
    chrome.storage.local.set({
      quickTaskTitle: info.selectionText.substring(0, 100),
      quickTaskUrl: tab.url
    });
    
    // Open the popup
    chrome.action.openPopup();
  }
});