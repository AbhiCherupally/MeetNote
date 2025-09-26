# MeetNote Local Testing Guide

## ✅ Backend Status (RUNNING)
Your Docker containers are now running successfully:
- **Backend API**: http://localhost:3001 ✅
- **MongoDB**: localhost:27017 ✅ 
- **Redis**: localhost:6379 ✅

## 🚀 Testing Your Chrome Extension Locally

### Step 1: Verify Backend is Running
```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### Step 2: Install Chrome Extension in Developer Mode

1. **Open Chrome Extensions Page:**
   - Navigate to `chrome://extensions/`
   - Or go to Chrome Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load Your Extension:**
   - Click "Load unpacked" button
   - Navigate to: `/Users/abhi/Documents/Projects/MeetNote/chrome-extension`
   - Select the folder and click "Open"

4. **Verify Installation:**
   - You should see "MeetNote AI Assistant" in your extensions list
   - The extension icon should appear in your browser toolbar

### Step 3: Test Extension Functionality

#### 3.1 Test Popup Interface
1. Click the MeetNote extension icon in your browser toolbar
2. You should see the login/signup interface
3. Try creating an account or logging in

#### 3.2 Test Meeting Detection
1. Navigate to a supported meeting platform:
   - **Zoom**: https://zoom.us/
   - **Google Meet**: https://meet.google.com/
   - **Microsoft Teams**: https://teams.microsoft.com/
   - **Webex**: https://webex.com/

2. The extension should automatically detect you're on a meeting platform
3. Check the popup - it should show meeting controls

#### 3.3 Test Recording Features
1. Join or start a meeting on any supported platform
2. Click the extension popup
3. Click "Start Recording" button
4. The extension should:
   - Change status to "Recording"
   - Show a red recording indicator
   - Begin capturing meeting data

### Step 4: Test Backend Integration

#### 4.1 Test Authentication
```bash
# Test user registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test user login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### 4.2 Test Meeting Creation
```bash
# Create a test meeting (use token from login response)
curl -X POST http://localhost:3001/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Test Meeting","platform":"zoom","meetingUrl":"https://zoom.us/j/123456789"}'
```

### Step 5: Test AI Features

#### 5.1 Verify API Keys Configuration
Your API keys are configured:
- **Assembly AI**: `598c0c5952444246ba2c1af3eb010d0b` ✅
- **OpenRouter**: `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` ✅
- **Model**: `mistralai/mistral-7b-instruct:free` ✅

#### 5.2 Test AI Summary Generation
```bash
# Test AI summary (replace TOKEN and MEETING_ID)
curl -X POST http://localhost:3001/api/meetings/MEETING_ID/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 6: Extension Keyboard Shortcuts

Test the keyboard shortcuts:
- **Alt+Shift+R**: Start/Stop recording
- **Alt+Shift+S**: Generate summary
- **Alt+Shift+H**: Show/Hide highlights

### Step 7: Debug Issues

#### Check Extension Console
1. Right-click extension icon → "Inspect popup"
2. Check Console tab for JavaScript errors
3. Check Network tab for failed API calls

#### Check Backend Logs
```bash
cd /Users/abhi/Documents/Projects/MeetNote/backend
docker-compose logs -f app
```

#### Check Extension Background Script
1. Go to `chrome://extensions/`
2. Click "Inspect views: background page" under MeetNote
3. Check console for background script logs

### Step 8: Common Test Scenarios

#### Scenario A: Full Meeting Workflow
1. Open Zoom/Meet in one tab
2. Click extension → Login
3. Start a meeting
4. Click "Start Recording"
5. Have a brief conversation
6. Click "Stop Recording"
7. Wait for AI analysis
8. Check generated summary and highlights

#### Scenario B: Multi-Platform Testing
1. Test extension on different meeting platforms
2. Verify platform detection works correctly
3. Check that meeting URLs are captured properly

#### Scenario C: Offline Testing
1. Stop Docker containers: `docker-compose down`
2. Test extension behavior when backend is offline
3. Verify error messages are user-friendly

## 🔧 Development Commands

### Backend Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose down && docker-compose up --build -d
```

### Extension Development
```bash
# After making changes to extension code:
# 1. Go to chrome://extensions/
# 2. Click reload button on MeetNote extension
# 3. Test your changes
```

## 📊 Success Criteria

✅ **Backend Health Check**: Returns 200 status
✅ **Extension Installation**: Shows in Chrome extensions
✅ **Meeting Detection**: Works on Zoom/Meet/Teams
✅ **Authentication**: Login/signup flow works
✅ **Recording Controls**: Start/stop buttons functional
✅ **AI Integration**: Summary generation works
✅ **Data Persistence**: Meetings saved to database

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not loading | Check manifest.json syntax |
| API calls failing | Verify backend is running on port 3001 |
| Authentication errors | Check JWT token in extension storage |
| Meeting not detected | Ensure you're on a supported platform URL |
| AI features not working | Verify API keys in backend/.env |
| Docker issues | Run `docker-compose down && docker-compose up --build` |

## 🎯 Next Steps

After successful local testing:
1. Deploy backend to Render
2. Update extension API endpoints to production
3. Submit extension to Chrome Web Store
4. Deploy frontend to Netlify

Your MeetNote system is now ready for local testing! 🚀