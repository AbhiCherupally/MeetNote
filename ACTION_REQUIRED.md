# 🎯 ACTION REQUIRED: Add API Key to Render

## YOU MUST DO THIS NOW:

### 1. Go to Render Dashboard
👉 **https://dashboard.render.com**

### 2. Find Your Service
- Look for: **`meetnote-backend`**
- Click on it

### 3. Add Environment Variable
```
Click "Environment" (left sidebar)
    ↓
Scroll to "Environment Variables"
    ↓
Click "Add Environment Variable"
    ↓
Enter:
  Key:   ASSEMBLYAI_API_KEY
  Value: 598c0c5952444246ba2c1af3eb010d0b
    ↓
Click "Save Changes"
    ↓
Wait 2-3 minutes for redeploy
```

### 4. Verify It Worked

Check the logs in Render. You should see:
```
✅ AssemblyAI configured
```

If you see:
```
⚠️ No ASSEMBLYAI_API_KEY found - using mock transcription
```
Then the API key wasn't added properly.

---

## Why This Is Needed

❌ **Problem:** The `render.yaml` file in your code CANNOT automatically set secret API keys. Render ignores those for security.

✅ **Solution:** You must manually add environment variables through the Render dashboard UI.

---

## After Adding the Key

Once Render redeploys with the API key:

1. **Reload extension:** Go to `chrome://extensions/` and click refresh
2. **Join a meeting:** https://meet.google.com/new  
3. **Start recording:** Click extension → Start Recording
4. **Speak:** Say something into your microphone
5. **Wait 5-10 seconds:** Real transcription will appear!

---

## What's Already Done ✅

- Backend code supports AssemblyAI
- Extension captures audio properly
- Live transcript panel shows
- State persistence works
- No login required

## What's Missing ⏳

- **YOU** need to add the API key to Render dashboard
- That's it!

---

## Screenshot Guide

### Step 1: Open Render Dashboard
![image](https://dashboard.render.com)

### Step 2: Find meetnote-backend
Look for your service in the list

### Step 3: Environment Tab
Click "Environment" on the left sidebar

### Step 4: Add Variable
```
Click: [+ Add Environment Variable]

Key:   ASSEMBLYAI_API_KEY
Value: 598c0c5952444246ba2c1af3eb010d0b

Click: [Save Changes]
```

### Step 5: Wait for Deploy
Watch the "Events" tab - wait for "Deploy live"

---

## Test Commands

After adding the key, run these in your terminal:

```bash
# Test health
curl https://meetnote-backend.onrender.com/health

# Test transcription (should NOT be mock anymore)
curl -X POST https://meetnote-backend.onrender.com/api/meetings/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_data":"dGVzdA==","format":"webm"}'
```

---

## 🚨 CRITICAL

**Without the API key in Render dashboard:**
- ❌ Will use mock transcription (fake text)
- ❌ Won't transcribe your actual voice
- ❌ Won't work properly

**With the API key in Render dashboard:**
- ✅ Real transcription of your voice
- ✅ Accurate text
- ✅ Speaker labels
- ✅ Everything works!

---

**Next Step:** Go to https://dashboard.render.com NOW and add the key!
