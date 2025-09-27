#!/bin/bash

echo "🧪 MeetNote Chrome Extension Test Guide"
echo "======================================="

# Check if backend is running
echo "🔍 1. Checking Backend Connection..."
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:8000"
    curl -s http://localhost:8000/api/health | python3 -m json.tool
else
    echo "❌ Backend not responding at localhost:8000"
    echo "   Run: ./start-docker.sh start"
    exit 1
fi

echo ""
echo "📋 2. Chrome Extension Setup:"
echo "   1. Open Chrome and go to: chrome://extensions/"
echo "   2. Enable 'Developer mode' (top-right toggle)"
echo "   3. Click 'Load unpacked'"
echo "   4. Select folder: $(pwd)/chrome-extension/"
echo "   5. Extension should appear with MeetNote icon"

echo ""
echo "🎯 3. Testing Steps:"
echo "   a) Click MeetNote extension icon in Chrome toolbar"
echo "   b) You should see login popup"
echo "   c) Use test credentials:"
echo "      Email: abhi@meetnote.app"
echo "      Password: admin123"

echo ""
echo "🎥 4. Meeting Test:"
echo "   a) Join any meeting (try: https://meet.google.com/new)"
echo "   b) Extension should detect the meeting platform"
echo "   c) Click 'Start Recording' in extension popup"
echo "   d) Grant microphone permissions when prompted"

echo ""
echo "🔍 5. Debug Console:"
echo "   - Right-click extension icon → 'Inspect popup'"
echo "   - Check Console tab for any errors"
echo "   - Background script: chrome://extensions → MeetNote → 'Inspect views: service worker'"

echo ""
echo "📊 6. Backend Logs:"
echo "   ./start-docker.sh logs"

echo ""
echo "🚨 Common Issues:"
echo "   • 'Access blocked': Add http://localhost:8000/* to host_permissions"
echo "   • 'Audio capture failed': Grant microphone permission to Chrome"
echo "   • 'Authentication failed': Check backend is running"
echo "   • Extension not loading: Refresh chrome://extensions/"

echo ""
echo "✅ Ready to test! Extension folder: $(pwd)/chrome-extension/"