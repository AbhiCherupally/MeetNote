# 🚀 COMPLETE SETUP GUIDE - AssemblyAI Integration

## ⚠️ IMPORTANT: You need to manually add the API key to Render

The `render.yaml` file can't automatically set API keys. You must add it through the Render dashboard.

---

## Step 1: Add AssemblyAI API Key to Render

### Go to Render Dashboard
1. Open https://dashboard.render.com
2. Find your service: **meetnote-backend**
3. Click on it

### Add Environment Variable
1. Click **"Environment"** tab on the left
2. Scroll to **"Environment Variables"** section
3. Click **"Add Environment Variable"**
4. Enter:
   - **Key:** `ASSEMBLYAI_API_KEY`
   - **Value:** `598c0c5952444246ba2c1af3eb010d0b`
5. Click **"Save Changes"**

### Wait for Auto-Deploy
- Render will automatically redeploy (takes 2-3 minutes)
- Watch the **"Events"** tab for "Deploy live"
- Look for this log: `✅ AssemblyAI configured`

---

## Step 2: Verify Backend is Working

### Test Health Endpoint
```bash
curl https://meetnote-backend.onrender.com/health
```

**Expected:**
```json
{"status":"healthy"}
```

### Test Transcription Endpoint
```bash
curl -X POST https://meetnote-backend.onrender.com/api/meetings/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_data":"dGVzdA==","format":"webm"}'
```

**Expected (Mock Mode - if API key not set):**
```json
{
  "success": true,
  "transcript": [
    {
      "timestamp": "0:00",
      "text": "Let's start today's meeting...",
      "speaker": "Speaker 1"
    }
  ]
}
```

**Expected (Real Mode - with API key):**
Will actually transcribe the audio!

---

## Step 3: Reload Chrome Extension

1. Go to `chrome://extensions/`
2. Find **MeetNote** extension
3. Click the **refresh icon** 🔄
4. Check for errors in console

---

## Step 4: Test End-to-End

### Start Recording
1. Join a Google Meet: https://meet.google.com/new
2. Click **MeetNote** extension icon
3. Should show: **"📹 Google Meet - Meeting in progress"**
4. Click **"Start Recording"** button
5. ✅ Should see: Recording timer counting (00:01, 00:02...)

### Check Live Transcript
1. **Look at the meeting page** (not the extension)
2. ✅ Should see **"Live Transcript"** panel on the right
3. **Speak into your microphone**
4. Wait 5-10 seconds
5. ✅ Real transcription should appear!

### Check Console Logs

**Extension Background Console:**
```
🎤 Background: Starting recording...
✅ Background: Got stream ID
✅ Offscreen document created
✅ Background: Recording started
📦 Offscreen: Audio chunk: 45678 bytes
📤 Offscreen: Sending audio to background
📤 Background: Sending to backend for transcription...
📦 Audio size: 45.67 KB
📤 Uploading audio to AssemblyAI...
✅ Audio uploaded
🎤 Requesting transcription...
📊 Status: completed
✅ Background: Transcript updated, total segments: 1
```

**Live Transcript Panel:**
Should show your actual words!

### Stop Recording
1. Click extension icon
2. Click **"Stop Recording"**
3. Wait 2-3 seconds
4. ✅ Should see alert: **"Meeting saved with AI summary!"**

### Verify Saved Meeting
```bash
curl https://meetnote-backend.onrender.com/api/meetings/
```

**Expected:**
```json
{
  "success": true,
  "meetings": [
    {
      "id": 1,
      "title": "Meeting 10/3/2025, 2:30:45 PM",
      "transcript": "...",
      "summary": "...",
      "date": "2025-10-03T14:30:45"
    }
  ]
}
```

---

## Troubleshooting

### ❌ Still showing mock transcription
**Cause:** API key not set in Render

**Fix:**
1. Go to Render dashboard
2. Check Environment Variables
3. Make sure `ASSEMBLYAI_API_KEY` exists
4. Check logs for: `✅ AssemblyAI configured`
5. If you see: `⚠️ No ASSEMBLYAI_API_KEY found` → API key missing

### ❌ "AssemblyAI upload failed"
**Cause:** Invalid API key or network issue

**Fix:**
1. Double-check API key: `598c0c5952444246ba2c1af3eb010d0b`
2. Test API key directly:
```bash
curl https://api.assemblyai.com/v2/transcript \
  -H "authorization: 598c0c5952444246ba2c1af3eb010d0b" \
  -H "content-type: application/json" \
  -d '{"audio_url":"https://example.com/test.mp3"}'
```

### ❌ Live transcript not showing
**Cause:** Content script not receiving messages

**Fix:**
1. Reload extension
2. Refresh meeting page
3. Check content script console for errors
4. Make sure you clicked "Start Recording"

### ❌ Recording timer not showing
**Cause:** State not persisting

**Fix:**
1. Check background console for recording state
2. Make sure popup.js loaded properly
3. Try clicking "Start Recording" again

---

## Current Status

### ✅ Completed
- Backend code updated with AssemblyAI
- `assemblyai==0.17.0` added to requirements.txt
- Removed mock login system
- Fixed content.js to work without auth
- State persistence implemented
- Live transcript forwarding working

### ⏳ Pending (YOU MUST DO)
- [ ] Add `ASSEMBLYAI_API_KEY` to Render dashboard
- [ ] Wait for Render redeploy
- [ ] Test with real audio

### 🎯 Expected Result
- Real transcription of your voice
- Speaker labels (Speaker A, Speaker B)
- Accurate text in Live Transcript panel
- Meetings saved with full transcript
- AI summary generated by OpenRouter

---

## Quick Reference

### API Endpoints
- Health: `https://meetnote-backend.onrender.com/health`
- Transcribe: `POST /api/meetings/transcribe`
- Meetings: `GET /api/meetings/`
- Create: `POST /api/meetings/create?title=...`

### Environment Variables (Render)
```
ASSEMBLYAI_API_KEY = 598c0c5952444246ba2c1af3eb010d0b
OPENROUTER_API_KEY = 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
DATABASE_URL = (auto-set by Render)
PYTHON_VERSION = 3.11.0
```

### Extension Files Changed
- `chrome-extension/content.js` - Removed auth check
- `chrome-extension/background.js` - Forwards transcripts to content
- `chrome-extension/popup.js` - State persistence
- `chrome-extension/offscreen.js` - Audio recording

### Backend Files Changed
- `backend/services/stt.py` - AssemblyAI implementation
- `backend/requirements.txt` - Added assemblyai
- `render.yaml` - Environment variable config

---

## Final Checklist

Before testing, make sure:
- [ ] AssemblyAI API key added to Render
- [ ] Render deployment succeeded
- [ ] Backend logs show: `✅ AssemblyAI configured`
- [ ] Extension reloaded at chrome://extensions/
- [ ] Meeting page refreshed
- [ ] Microphone working in browser

---

## Support Links

- AssemblyAI Dashboard: https://www.assemblyai.com/app
- Render Dashboard: https://dashboard.render.com
- GitHub Repo: https://github.com/AbhiCherupally/MeetNote
- Backend: https://meetnote-backend.onrender.com

---

**Last Updated:** Commit `433ed99`
**Status:** ✅ Code Ready - ⏳ Waiting for Render Config
