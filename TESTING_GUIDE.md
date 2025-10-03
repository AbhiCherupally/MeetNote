# MeetNote Extension Testing Guide

## What Was Fixed

### 1. ✅ Recording State Persistence
**Problem:** When you clicked "Start Recording" and returned to the meeting, then came back to the extension, it showed "Start Recording" again instead of "Stop Recording".

**Solution:** Added `checkRecordingStatus()` function in `popup.js` that queries the background service worker for current recording state when popup opens.

### 2. ✅ Live Transcript Display  
**Problem:** The Live Transcript panel wasn't showing up on the meeting page.

**Solution:** 
- Background.js now forwards transcript updates to content script via `chrome.tabs.sendMessage()`
- Content.js listens for `RECORDING_STARTED` and `TRANSCRIPT_UPDATED` messages
- Automatically shows transcript overlay when recording starts
- Updates transcript UI with new segments in real-time

## Testing Steps

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find "MeetNote" extension
3. Click the reload icon 🔄
4. Check for errors in the extension console

### Step 2: Test Recording State Persistence
1. Join a Google Meet (or open meet.google.com/new)
2. Click MeetNote extension icon
3. Should show "📹 Google Meet - Meeting in progress"
4. Click "Start Recording" button
5. **Close the extension popup** (click elsewhere or press Esc)
6. **Click extension icon again**
7. ✅ Should show "Stop Recording" button (not "Start Recording")
8. ✅ Duration timer should be counting

### Step 3: Test Live Transcript
1. Start recording (if not already)
2. **Look at the meeting page** (not the extension popup)
3. ✅ Should see a floating transcript panel on the right side
4. Panel header: "Live Transcript"
5. Speak into your microphone or play audio
6. Wait 5-10 seconds (audio chunks are sent every 5 seconds)
7. ✅ Transcript should appear in the panel
8. ✅ Panel should auto-scroll to show latest text

### Step 4: Test Stop Recording
1. Click extension icon
2. Click "Stop Recording"
3. Wait 2-3 seconds
4. ✅ Should see alert: "Meeting saved with AI summary!"
5. Check backend: `https://meetnote-backend.onrender.com/api/meetings/`
6. ✅ Should see your meeting in the list

## Expected Behavior

### Extension Popup States

**Before Recording:**
```
Status: 🟢 Connected
Meeting: 📹 Google Meet - Meeting in progress
Button: ● Start Recording
```

**During Recording:**
```
Status: 🟢 Connected
Meeting: 📹 Google Meet - Meeting in progress
Button: ■ Stop Recording
Duration: 00:23 (counting up)
```

**After Reopening Popup (While Recording):**
```
Status: 🟢 Connected
Meeting: 📹 Google Meet - Meeting in progress
Button: ■ Stop Recording (NOT Start Recording!)
Duration: 01:45 (continues from where it left off)
```

### Live Transcript Panel (On Meeting Page)

**Appearance:**
- Fixed position: top-right corner
- Dark semi-transparent background
- Draggable header bar
- Auto-scrolling content
- Shows last 10 transcript segments

**Content Format:**
```
Speaker: [Transcript text here]
Speaker: [Another transcript text]
```

## Troubleshooting

### "No meeting detected"
- Make sure you're on a meeting URL (meet.google.com/xxx-xxxx-xxx)
- Refresh the page and try again

### Live transcript not showing
- Open browser console (F12)
- Check for content script errors
- Make sure you clicked "Start Recording"
- Wait 5-10 seconds for first audio chunk

### Recording state not persisting
- Reload extension at chrome://extensions/
- Check background service worker console for errors
- Look for "checkRecordingStatus" logs in popup console

### Transcript not updating
- Check background service worker console
- Look for "📤 Background: Sending to backend"
- Verify backend is responding: https://meetnote-backend.onrender.com/health
- Check content script console for "📝 Updating transcript"

## Console Logs to Look For

### Background Service Worker
```
🎤 Background: Starting recording...
✅ Background: Got stream ID
✅ Offscreen document created
✅ Background: Recording started
📤 Background: Sending to backend for transcription...
✅ Background: Transcript updated, total segments: 3
```

### Offscreen Document
```
🎤 Offscreen: Starting recording with stream ID: xxx
✅ Offscreen: Got audio stream
✅ Offscreen: Recording started
📦 Offscreen: Audio chunk: 45678 bytes
📤 Offscreen: Sending audio to background
```

### Popup
```
✅ Restored recording state
🔍 Checking current tab: https://meet.google.com/xxx
✅ Meeting detected: {platform: 'google-meet', name: 'Google Meet'}
📨 Popup received message: RECORDING_STARTED
```

### Content Script (Meeting Page)
```
MeetNote content script initialized on: meet.google.com
✅ Platform detected: google-meet
📄 Recording started - showing transcript overlay
📝 Updating transcript with new data: [{text: "Hello..."}]
✅ Transcript UI updated with 1 segments
```

## Architecture Overview

```
Meeting Page (content.js)
    ↓ Shows Live Transcript Panel
    
Extension Popup (popup.js)
    ↓ User clicks "Start Recording"
    
Background Service Worker (background.js)
    ↓ Gets tab capture stream ID
    
Offscreen Document (offscreen.js)
    ↓ Captures audio with getUserMedia
    ↓ Records audio chunks every 5 seconds
    ↓ Converts to base64
    
Background Service Worker
    ↓ Receives base64 audio
    ↓ Sends to Backend API
    
Backend (Python FastAPI)
    ↓ Google Gemini API transcription
    ↓ Returns transcript
    
Background Service Worker
    ↓ Forwards to Content Script
    
Content Script
    ↓ Updates Live Transcript Panel
```

## Success Criteria

✅ Recording state persists when popup closes/reopens
✅ Live transcript appears on meeting page
✅ Transcript updates every 5-10 seconds
✅ Stop recording saves to database
✅ No "getUserMedia" errors
✅ No "active tab" errors

## Latest Changes (Commit: 6c43825)

1. Added `checkRecordingStatus()` in popup.js
2. Background forwards `RECORDING_STARTED` and `TRANSCRIPT_UPDATED` to content script
3. Content script handles both message types
4. Added `updateTranscriptContent()` method to display transcripts
5. Transcript overlay shows automatically when recording starts

All changes committed and pushed to GitHub ✅
