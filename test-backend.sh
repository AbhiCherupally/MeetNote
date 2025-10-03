#!/bin/bash

echo "🔍 MeetNote Backend Diagnostics"
echo "================================"
echo ""

echo "1. Testing Backend Health..."
HEALTH=$(curl -s https://meetnote-backend.onrender.com/health)
echo "   Response: $HEALTH"
echo ""

echo "2. Testing Transcription (Mock Check)..."
TRANSCRIPT=$(curl -s -X POST https://meetnote-backend.onrender.com/api/meetings/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_data":"dGVzdCBhdWRpbw==","format":"webm"}')
echo "   Response: $TRANSCRIPT"
echo ""

echo "3. Checking if response is mock data..."
if echo "$TRANSCRIPT" | grep -q "Let's start today's meeting\|I think we should focus\|Great work everyone\|Thanks everyone for joining"; then
    echo "   ❌ MOCK MODE DETECTED"
    echo "   The backend is using sample/mock transcription"
    echo ""
    echo "   This means ASSEMBLYAI_API_KEY is NOT set in Render"
else
    echo "   ✅ REAL MODE - AssemblyAI is working!"
fi
echo ""

echo "4. Testing Meetings List..."
MEETINGS=$(curl -s https://meetnote-backend.onrender.com/api/meetings/)
echo "   Response: $MEETINGS"
echo ""

echo "================================"
echo "📋 DIAGNOSIS:"
echo ""
echo "If you see MOCK MODE above, you need to:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click on 'meetnote-backend'"
echo "3. Click 'Environment' tab"
echo "4. Manually add:"
echo "     Key: ASSEMBLYAI_API_KEY"
echo "     Value: 598c0c5952444246ba2c1af3eb010d0b"
echo "5. Save and wait for redeploy"
echo ""
echo "The render.yaml file does NOT automatically set API keys."
echo "Render requires manual configuration for security."
