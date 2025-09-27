# 🎯 **Chrome Extension Testing - Complete Guide**

## ✅ **Backend Status: WORKING**
- Backend running at: http://localhost:8000
- Authentication: ✅ Working (abhi@meetnote.app / admin123)
- Health check: ✅ Healthy
- WebSocket: ✅ Ready

---

## 📱 **Chrome Extension Setup**

### **Step 1: Load Extension**
1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Navigate to: `/Users/abhi/Documents/Projects/MeetNote/chrome-extension/`
6. Click "Select Folder"

### **Step 2: Verify Installation**
- ✅ MeetNote icon should appear in toolbar
- ✅ Extension should be listed as "MeetNote - AI Meeting Assistant"
- ✅ Version 1.0.0

---

## 🧪 **Testing Process**

### **Test 1: Extension Popup**
1. Click the MeetNote extension icon in Chrome toolbar
2. **Expected**: Login popup should appear
3. **Credentials**: 
   - Email: `abhi@meetnote.app`
   - Password: `admin123`
4. **Expected**: Should show "Login successful" and main interface

### **Test 2: Meeting Platform Detection**
1. Go to a meeting platform:
   - **Google Meet**: https://meet.google.com/new
   - **Zoom**: https://zoom.us/test
   - **Teams**: https://teams.microsoft.com/
2. **Expected**: Extension badge should change color/text
3. **Expected**: Extension popup should show "Meeting detected"

### **Test 3: Recording Functionality**
1. Join/start a meeting on any supported platform
2. Open MeetNote extension popup
3. Click "Start Recording" button
4. **Expected**: Browser will ask for microphone permission - **GRANT IT**
5. **Expected**: Extension shows "Recording..." status
6. **Expected**: Backend logs show WebSocket connection and audio data

### **Test 4: Stop Recording**
1. Click "Stop Recording" in extension
2. **Expected**: Recording stops successfully
3. **Expected**: Meeting data saved to backend

---

## 🔍 **Debug & Troubleshooting**

### **Debug Extension**
```bash
# Right-click extension icon → "Inspect popup"
# Check Console tab for errors

# Background script debugging:
# chrome://extensions/ → MeetNote → "Inspect views: service worker"
```

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| "Access denied" | Check manifest.json has localhost permission |
| "Authentication failed" | Verify backend is running at localhost:8000 |
| "Audio capture failed" | Grant microphone permission to Chrome |
| Extension won't load | Check all files exist, refresh extensions page |
| No meeting detected | Try supported platforms (Zoom, Meet, Teams) |

### **Backend Logs**
```bash
# View real-time backend logs
cd /Users/abhi/Documents/Projects/MeetNote
./start-docker.sh logs

# Or specific to backend
docker-compose logs backend -f
```

---

## 📊 **Expected Behavior**

### ✅ **Working Features**
- [x] Extension loads and appears in toolbar
- [x] Authentication with demo credentials
- [x] Meeting platform detection (Zoom, Meet, Teams, Webex)
- [x] WebSocket connection to backend
- [x] Audio capture permissions
- [x] Start/stop recording controls

### 🚧 **In Development**
- [ ] Real-time transcript display
- [ ] AssemblyAI integration (configured but needs real-time impl)
- [ ] AI meeting summaries
- [ ] Meeting history in dashboard

---

## 🎯 **Success Indicators**

1. **Extension Loaded**: ✅ Icon in toolbar
2. **Authentication**: ✅ Login with abhi@meetnote.app/admin123
3. **Meeting Detection**: ✅ Badge changes on meeting sites
4. **Audio Permissions**: ✅ Chrome grants microphone access
5. **Recording**: ✅ Start/stop buttons work
6. **Backend Communication**: ✅ API calls successful
7. **WebSocket**: ✅ Real-time connection established

---

## 🚀 **Next Steps After Testing**

1. **If all tests pass**: Extension is ready for real meetings!
2. **Real meeting test**: Join actual Zoom/Meet call and test
3. **Production deployment**: Deploy backend to Render
4. **Chrome Web Store**: Submit extension for public use

---

## 🆘 **Need Help?**

### Immediate Debugging:
```bash
# Backend health
curl http://localhost:8000/api/health

# Test authentication
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abhi@meetnote.app","password":"admin123"}'

# View logs
./start-docker.sh logs
```

### Extension Console:
- Right-click MeetNote icon → Inspect popup
- chrome://extensions/ → MeetNote → Inspect views

---

**🎯 Ready to test! Start with Step 1 above.**