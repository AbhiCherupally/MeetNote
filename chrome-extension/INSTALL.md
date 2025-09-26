# MeetNote Chrome Extension - Installation Guide

## 📥 **Installation Methods**

### **Method 1: Developer Mode (Recommended for Development)**

1. **Download/Clone the Extension**
   ```bash
   git clone <repository>
   cd MeetNote/chrome-extension
   ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - OR click **Menu (⋮)** → **More Tools** → **Extensions**

3. **Enable Developer Mode**
   - Toggle **"Developer mode"** switch in the top-right corner
   - This enables loading unpacked extensions

4. **Load the Extension**
   - Click **"Load unpacked"** button
   - Select the `chrome-extension` folder from your MeetNote project
   - The extension should now appear in your extensions list

5. **Verify Installation**
   - Look for the MeetNote icon in your Chrome toolbar
   - Click the icon to open the popup
   - You should see the MeetNote interface

### **Method 2: Chrome Web Store (Production)**
*Coming soon - extension will be published to Chrome Web Store*

---

## 🔧 **Post-Installation Setup**

### **1. Pin the Extension**
- Click the **Extensions puzzle icon** in Chrome toolbar
- Find **MeetNote** in the list
- Click the **📌 pin icon** to keep it visible in toolbar

### **2. Grant Permissions**
When first using the extension, you'll be asked to grant permissions:
- ✅ **Access your tabs** - To detect meeting platforms
- ✅ **Access meeting sites** - Zoom, Google Meet, Teams integration
- ✅ **Show notifications** - Recording status updates
- ✅ **Store data** - Save settings and authentication

### **3. Create Account & Sign In**
1. Click the MeetNote icon in toolbar
2. Click **"Sign In to MeetNote"**
3. Choose option:
   - **Email/Password**: Create new account or sign in
   - **Google OAuth**: Sign in with Google account

### **4. Configure Settings** (Optional)
- Click **Settings** button in popup
- Configure:
  - Auto-recording preferences
  - Transcript overlay position
  - Keyboard shortcuts
  - Notification preferences

---

## 🎯 **Quick Test**

### **Test Meeting Detection**
1. Visit a meeting platform:
   - `https://zoom.us/test`
   - `https://meet.google.com/new`
   - `https://teams.microsoft.com/`

2. Check extension status:
   - Extension icon should show colored badge
   - Popup should show "Meeting Detected"
   - Platform name should be displayed

### **Test Recording** (With Backend Running)
1. Ensure backend is running (see backend setup)
2. Join or start a test meeting
3. Click MeetNote icon → **"Start Recording"**
4. Verify recording indicator appears

---

## 🛠 **Development Setup**

### **File Structure Check**
Ensure your `chrome-extension` folder contains:
```
chrome-extension/
├── manifest.json     ✅ Extension configuration
├── background.js     ✅ Service worker
├── popup.html       ✅ Popup interface
├── popup.js         ❌ (Need to create)
├── popup.css        ❌ (Need to create)
├── content.js       ❌ (Need to create)
├── content.css      ❌ (Need to create)
└── icons/           ❌ (Need to create)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### **Missing Files Creation**
I notice some files are missing. Let me create them:

1. **Icons** - Need extension icons
2. **popup.js** - Popup functionality
3. **popup.css** - Popup styling
4. **content.js** - Page injection script
5. **content.css** - Overlay styling

---

## ❌ **Troubleshooting**

### **Extension Won't Load**
- ✅ Check that `manifest.json` exists and is valid
- ✅ Ensure all referenced files exist
- ✅ Check Chrome DevTools console for errors
- ✅ Try reloading the extension

### **"Load unpacked" Button Missing**
- ✅ Enable **Developer mode** toggle
- ✅ Refresh the extensions page

### **Permissions Denied**
- ✅ Check extension permissions in Chrome settings
- ✅ Manually grant permissions if needed
- ✅ Try removing and reinstalling extension

### **Meeting Detection Not Working**
- ✅ Check if on supported platform (Zoom/Meet/Teams)
- ✅ Verify content script is injected
- ✅ Check browser console for errors

### **Authentication Issues**
- ✅ Ensure backend is running and accessible
- ✅ Check API endpoint URLs in background.js
- ✅ Verify network connectivity

---

## 🔄 **Updating the Extension**

### **Development Updates**
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click **🔄 reload** button under MeetNote extension
4. Test your changes

### **Automatic Updates** (Production)
- Chrome Web Store extensions update automatically
- Users will be notified of available updates

---

## 🎯 **Next Steps**

After successful installation:

1. **✅ Test on Meeting Platforms**
   - Join Zoom/Meet/Teams meetings
   - Verify detection and recording

2. **✅ Configure Backend Connection**
   - Ensure backend API is accessible
   - Test authentication flow

3. **✅ Customize Settings**
   - Set up keyboard shortcuts
   - Configure auto-recording preferences

4. **✅ Test Key Features**
   - Recording start/stop
   - Highlight creation
   - Transcript overlay

---

## 📞 **Support**

If you encounter issues:
- Check browser console errors
- Verify all files are present
- Ensure backend is running
- Test on supported meeting platforms

**Ready to record smarter meetings! 🎙️✨**