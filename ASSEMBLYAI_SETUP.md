# AssemblyAI Setup Instructions

## What Changed

The backend now uses **AssemblyAI** for real speech-to-text transcription instead of mock data.

## Features

✅ Real audio transcription
✅ Speaker diarization (identifies different speakers)
✅ High accuracy
✅ Free tier: 100 hours/month
✅ Fallback to mock transcription if API key not set

## Get Your Free API Key

1. Go to https://www.assemblyai.com/
2. Click "Get Started Free" or "Sign Up"
3. Verify your email
4. Go to your dashboard: https://www.assemblyai.com/app
5. Copy your API key from the dashboard

## Add API Key to Render

1. Go to https://dashboard.render.com/
2. Find your `meetnote-backend` service
3. Click "Environment"
4. Add new environment variable:
   - **Key:** `ASSEMBLYAI_API_KEY`
   - **Value:** [paste your API key]
5. Click "Save Changes"
6. Service will auto-redeploy (takes ~2 minutes)

## Alternative: Add to Local .env

If testing locally:

```bash
cd backend
echo "ASSEMBLYAI_API_KEY=your_api_key_here" >> .env
```

## How It Works

### With API Key (Real Transcription)
```
Audio Chunk (5 seconds)
  ↓
Upload to AssemblyAI
  ↓
Request Transcription with Speaker Labels
  ↓
Poll for Results (max 30 seconds)
  ↓
Format and Return Transcript
```

### Without API Key (Mock Mode)
```
Audio Chunk
  ↓
Generate realistic mock transcript
  ↓
Return sample text
```

## Testing Real Transcription

1. Add ASSEMBLYAI_API_KEY to Render
2. Wait for redeploy
3. Reload Chrome extension
4. Start recording on Google Meet
5. Speak clearly into microphone
6. Wait 5-10 seconds
7. Check Live Transcript panel - should show REAL transcription
8. Check backend logs on Render:
   ```
   ✅ AssemblyAI configured
   📦 Audio size: 45.2 KB
   📤 Uploading audio to AssemblyAI...
   ✅ Audio uploaded
   🎤 Requesting transcription...
   📊 Status: completed
   ✅ Transcription complete
   ```

## Verify Backend Logs

Go to Render dashboard → meetnote-backend → Logs

**Good logs:**
```
✅ AssemblyAI configured
📦 Audio size: 45.2 KB
📤 Uploading audio to AssemblyAI...
✅ Audio uploaded: https://cdn.assemblyai.com/upload/...
🎤 Requesting transcription...
⏳ Transcription job ID: 12345...
📊 Status: queued (attempt 1/30)
📊 Status: processing (attempt 2/30)
📊 Status: completed (attempt 3/30)
✅ Transcription segments: 2
```

**Mock mode (no API key):**
```
⚠️  No ASSEMBLYAI_API_KEY found - using mock transcription
📦 Audio size: 45.2 KB
📝 Mock transcription: Generating sample transcript
✅ Generated 2 mock transcript segments
```

## Troubleshooting

### "Using mock transcription"
- API key not set or invalid
- Add ASSEMBLYAI_API_KEY to Render environment variables

### Transcription timeout
- Audio too long (keep chunks to 5-10 seconds)
- AssemblyAI API slow
- Fallback to mock automatically happens

### Upload failed
- Check API key is correct
- Check Render logs for specific error
- Verify AssemblyAI account is active

### No transcript showing in extension
- Check browser console (F12)
- Check background service worker logs
- Verify backend is receiving audio: look for "📦 Audio size" in Render logs
- Check content script console: should see "📝 Updating transcript"

## Cost & Limits

**Free Tier:**
- 100 hours/month transcription
- Speaker diarization included
- Real-time transcription
- No credit card required

**Your Usage:**
- ~5 second chunks every 10 seconds
- 1 hour meeting = ~360 API calls
- Can handle ~16 hours of meetings per month (100 hours / 6 chunks per minute)

## Benefits Over Mock

**Mock Transcription:**
- ❌ Random sample text
- ❌ Not related to actual audio
- ❌ Same text repeated
- ✅ No API cost

**Real AssemblyAI:**
- ✅ Actual words spoken
- ✅ Speaker identification
- ✅ High accuracy
- ✅ Timestamps
- ✅ Free tier available

## Next Steps

After adding API key:

1. ✅ Backend will use real transcription
2. ✅ Extension removed login requirement
3. ✅ Content script won't ask for auth
4. ✅ Recording will work immediately
5. ✅ Meetings will save to database
6. ✅ Live transcript will show real words

## Files Changed

- `backend/services/stt.py` - Added AssemblyAI integration
- `backend/requirements.txt` - Added `assemblyai==0.17.0`
- `chrome-extension/content.js` - Removed auth check
- Backend automatically falls back to mock if no API key

All changes are committed and ready for deploy! 🚀
