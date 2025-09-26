# 🧪 **MeetNote Extension Local Testing Guide**

## 🚀 **Step 1: Start Backend Server**

### Option A: Quick Start (Recommended)
```bash
# Navigate to project
cd /Users/abhi/Documents/Projects/MeetNote

# Stop any existing server on port 3001
sudo lsof -ti:3001 | xargs kill -9

# Start backend
cd backend
PORT=3002 node src/app.js
```

### Option B: Docker Method
```bash
cd /Users/abhi/Documents/Projects/MeetNote/backend
docker-compose up -d
PORT=3002 node src/app.js
```

**✅ Expected Output:**
```
📦 MongoDB Connected: localhost
🚀 MeetNote API server running on port 3002
📊 Health check: http://localhost:3002/health
```

---

## 🔌 **Step 2: Install Chrome Extension**

### A. Load Extension in Chrome
1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle "Developer mode" in top-right corner

3. **Load Extension**
   - Click "Load unpacked"
   - Select folder: `/Users/abhi/Documents/Projects/MeetNote/chrome-extension`
   - Extension should appear in list

4. **Pin Extension**
   - Click Extensions puzzle icon in Chrome toolbar
   - Pin MeetNote extension (📌 icon)

---

## 🎯 **Step 3: Test Extension Features**

### A. Test Meeting Detection
1. **Visit Meeting Platforms:**
   ```
   https://zoom.us/test
   https://meet.google.com/new
   https://teams.microsoft.com/
   ```

2. **Check Extension Status:**
   - Extension icon should show colored badge
   - Click extension icon to open popup
   - Should see "Meeting Detected" message

### B. Test Authentication
1. **Click Extension Icon**
2. **Sign Up/Login:**
   - Click "Sign In to MeetNote" 
   - Enter test credentials:
     - Email: `test@meetnote.com`
     - Password: `testpassword123`
   - Or use "Sign in with Google"

### C. Test Recording Controls
1. **On Meeting Page:**
   - Should see floating MeetNote controls
   - Platform-specific buttons in meeting toolbar
   - Try keyboard shortcuts:
     - `Alt+R` - Toggle recording
     - `Alt+H` - Create highlight
     - `Alt+T` - Toggle transcript

---

## 🔧 **Step 4: Debug Common Issues**

### Backend Connection Issues
```bash
# Check if backend is running
curl http://localhost:3002/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### Extension Console Debugging
1. **Open Developer Tools:**
   - Right-click extension icon → "Inspect popup"
   - Or press `F12` on meeting page

2. **Check Console Logs:**
   - Look for MeetNote messages
   - Check for API connection errors

3. **Background Script Debugging:**
   ```
   chrome://extensions/
   → Click "background page" under MeetNote
   ```

### Permission Issues
1. **Check Extension Permissions:**
   ```
   chrome://extensions/
   → Click "Details" under MeetNote
   → Check "Site access" settings
   ```

2. **Grant All Permissions:**
   - Allow access to meeting sites
   - Enable notifications
   - Allow storage access

---

## 🧪 **Step 5: Test Scenarios**

### Scenario 1: Basic Meeting Recording
```bash
# 1. Start backend (port 3002)
# 2. Open https://zoom.us/test
# 3. Click MeetNote extension
# 4. Login with test account
# 5. Click "Start Recording"
# 6. Verify recording status
# 7. Click "Stop Recording"
```

### Scenario 2: Real-time Transcript
```bash
# 1. During recording
# 2. Press Alt+T or click transcript button
# 3. Should see transcript overlay
# 4. Verify live transcript updates (simulated)
```

### Scenario 3: Highlight Creation
```bash
# 1. During recording
# 2. Press Alt+H or click highlight button
# 3. Should see "Highlight created" notification
# 4. Check highlight counter in popup
```

---

## 🔍 **Step 6: API Testing**

### Test Backend Endpoints
```bash
# Health Check
curl http://localhost:3002/health

# Register User
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@meetnote.com","password":"testpassword123","firstName":"Test","lastName":"User"}'

# Login User
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@meetnote.com","password":"testpassword123"}'
```

---

## 🎯 **Step 7: Test AI Features**

### Test OpenRouter Integration
```bash
# Create a test meeting with transcript
curl -X POST http://localhost:3002/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Test Meeting","platform":"zoom","transcript":"Hello, this is a test meeting transcript."}'
```

### Test Assembly AI (Mock)
```bash
# The transcription service is ready but needs actual audio files
# For now, you can test with simulated transcript data
```

---

## 📱 **Step 8: Mobile Testing**

### Chrome Mobile (Android)
1. Enable USB Debugging on Android
2. Connect to Chrome DevTools
3. Test extension on mobile Chrome

---

## 🚨 **Troubleshooting**

### Port Already in Use
```bash
# Kill process on port 3001/3002
sudo lsof -ti:3001 | xargs kill -9
sudo lsof -ti:3002 | xargs kill -9
```

### Extension Won't Load
```bash
# Check manifest.json syntax
cd chrome-extension
node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json')))"
```

### Database Connection Issues
```bash
# Check MongoDB container
docker ps
docker logs backend-mongo-1

# Restart containers
docker-compose down && docker-compose up -d
```

### Clear Extension Data
```bash
# In Chrome DevTools Console (extension popup):
chrome.storage.sync.clear()
chrome.storage.local.clear()
```

---

## ✅ **Success Indicators**

### Backend Running ✅
- Health endpoint responds: `http://localhost:3002/health`
- No errors in terminal output
- MongoDB connection successful

### Extension Installed ✅  
- Appears in Chrome extensions list
- Icon visible in toolbar
- Popup opens when clicked

### Meeting Detection ✅
- Badge appears on meeting sites
- Platform name displayed in popup
- Recording controls enabled

### API Connection ✅
- Authentication works
- Recording start/stop functions
- No CORS errors in console

---

## 🎯 **Next Steps After Testing**

1. **✅ Test Core Features** - Recording, highlights, transcript
2. **✅ Verify AI Integration** - OpenRouter responses  
3. **✅ Test Assembly AI** - Upload audio file for transcription
4. **✅ Deploy Backend** - Deploy to Render/Railway
5. **✅ Deploy Frontend** - Deploy landing page to Netlify
6. **✅ Package Extension** - Prepare for Chrome Web Store

**Happy Testing! 🎙️✨**