# MeetNote Extension Debugging Guide

## How to Debug Recording Failures

### 1. Open Chrome Developer Tools for Extension

**Method A: Extension Popup Console**
1. Right-click on the MeetNote extension icon in the toolbar
2. Select "Inspect popup" 
3. Look at the Console tab for error messages when you try to record

**Method B: Background Script Console**
1. Go to `chrome://extensions/`
2. Find "MeetNote - AI Meeting Assistant"
3. Click "Inspect views: background page" (or "service worker")
4. Look at the Console tab for background script errors

**Method C: Content Script Console**
1. Open the meeting page (Google Meet)
2. Press F12 to open Developer Tools
3. Look at the Console tab for content script errors

### 2. Check Extension Permissions
1. Go to `chrome://extensions/`
2. Find MeetNote extension
3. Verify it has permissions for:
   - ✅ Active tab access
   - ✅ Storage
   - ✅ Notifications
   - ✅ Host permissions for meet.google.com

### 3. Check Authentication Status
1. Open extension popup
2. Look for authentication section
3. Try logging in with: `abhi@meetnote.app` / `admin123`

### 4. Check Backend Connection
1. Open extension background console
2. Look for API connection test results
3. Verify backend is responding at: https://meetnote.onrender.com

### 5. Manual Backend Test
Open browser console and run:
```javascript
fetch('https://meetnote.onrender.com/health')
  .then(response => response.json())
  .then(data => console.log('Backend health:', data))
  .catch(error => console.error('Backend error:', error));
```

### 6. Common Error Messages

- **"Not authenticated"** → Need to sign in to extension
- **"No meeting detected"** → Extension can't detect Google Meet
- **"Failed to start recording: 401"** → Authentication token expired
- **"Failed to start recording: 500"** → Backend server error
- **"Network error"** → Backend unreachable

### 7. Quick Fixes

**Reset Extension:**
1. Go to `chrome://extensions/`
2. Toggle MeetNote off and on
3. Refresh the meeting page

**Clear Extension Data:**
1. Right-click extension icon → "Remove from Chrome"
2. Reinstall from the zip file

**Check Meeting Page:**
1. Make sure you're actually in a Google Meet room
2. URL should be: `meet.google.com/xxx-xxxx-xxx`
3. Not just the meeting lobby

### 8. Debug Mode Setup

Add this to the meeting page console to see extension messages:
```javascript
// Listen for extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Extension message:', message);
});
```