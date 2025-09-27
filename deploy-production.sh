#!/bin/bash

echo "🚀 **MeetNote Production Deployment Guide**"
echo "=========================================="
echo ""

echo "✅ **Chrome Extension Updated for Production**"
echo "- Backend URL: https://meetnote.onrender.com"
echo "- WebSocket URL: wss://meetnote.onrender.com/ws"
echo "- CSP updated to allow production connections"
echo ""

echo "🎯 **Next Steps for Deployment:**"
echo ""

echo "**1. Deploy Backend to Render**"
echo "   a) Push code to GitHub:"
echo "      git add ."
echo "      git commit -m 'Configure for production deployment'"
echo "      git push origin main"
echo ""
echo "   b) Go to Render Dashboard (https://render.com)"
echo "   c) Connect your GitHub repo: AbhiCherupally/MeetNote"
echo "   d) Use render.yaml for auto-deployment"
echo ""

echo "**2. Set Environment Variables in Render:**"
echo "   Copy these from RENDER_ENV_VARIABLES.txt:"
echo "   - ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b"
echo "   - OPENROUTER_API_KEY=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"
echo "   - JWT_SECRET_KEY=ff6ff241d0c0f3d1649a7ff5dedb1b507277b9142e2bb0da20e0cd605453fbeaa95ff8dd3cf73f5c99a978939d7e7825387887f849e70cf70c93f3dab72fa744"
echo "   - CORS_ORIGIN=https://meetnoteapp.netlify.app"
echo "   - DATABASE_URL=(Render will provide this)"
echo ""

echo "**3. Deploy Frontend to Netlify**"
echo "   a) Go to Netlify Dashboard (https://netlify.com)"
echo "   b) Connect GitHub repo: AbhiCherupally/MeetNote"
echo "   c) Build settings:"
echo "      - Base directory: frontend"
echo "      - Build command: npm run build"
echo "      - Publish directory: frontend/.next"
echo ""

echo "**4. Set Netlify Environment Variables:**"
echo "   - NEXT_PUBLIC_API_URL=https://meetnote.onrender.com"
echo "   - NODE_ENV=production"
echo ""

echo "**5. Test Production Setup**"
echo "   a) Wait for both deployments to complete"
echo "   b) Test backend health: https://meetnote.onrender.com/api/health"
echo "   c) Test frontend: https://meetnoteapp.netlify.app"
echo "   d) Load updated Chrome extension and test with production URLs"
echo ""

echo "🔧 **Troubleshooting Commands:**"
echo "- Check Render logs: Visit Render dashboard → Your service → Logs"
echo "- Check Netlify logs: Visit Netlify dashboard → Your site → Functions"
echo "- Test API locally: curl https://meetnote.onrender.com/api/health"
echo ""

echo "📋 **File Locations:**"
echo "- Backend config: render.yaml"
echo "- Backend env vars: RENDER_ENV_VARIABLES.txt"
echo "- Frontend env vars: NETLIFY_ENV_VARIABLES.txt"
echo "- Chrome extension: chrome-extension/ (updated for production)"
echo ""

# Check if we have git configured
if git status > /dev/null 2>&1; then
    echo "✅ Git repository detected"
    echo ""
    echo "**Ready to deploy! Run these commands:**"
    echo "git add ."
    echo "git commit -m 'Configure for production deployment'"
    echo "git push origin main"
else
    echo "❌ Not in a git repository. Initialize git first:"
    echo "git init"
    echo "git remote add origin https://github.com/AbhiCherupally/MeetNote.git"
fi