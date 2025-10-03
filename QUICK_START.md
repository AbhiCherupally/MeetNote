# MeetNote - Quick Start Guide

## Backend Setup

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure API keys:**
```bash
cp .env.example .env
# Edit .env and add:
# - GOOGLE_GEMINI_API_KEY (get from https://aistudio.google.com/app/apikey)
# - OPENROUTER_API_KEY (get from https://openrouter.ai)
```

3. **Start backend:**
```bash
uvicorn main:app --reload --port 8000
# Or use: ./start.sh
```

Backend runs at: http://localhost:8000

## Chrome Extension Setup

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"

2. **Load extension:**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Test recording:**
   - Click extension icon
   - Click "Start Recording"
   - Speak for a few seconds
   - Click "Stop Recording"

## API Endpoints

- `POST /api/meetings/transcribe` - Transcribe audio
- `POST /api/meetings/create?title=...` - Save meeting with summary
- `GET /api/meetings/` - List all meetings
- `GET /api/meetings/{id}` - Get specific meeting

## Services Used

- **Google Gemini API**: Audio transcription with AI (free tier available)
- **OpenRouter Mistral 7B**: Free AI summarization and action item extraction
- **Storage**: In-memory (upgrade to PostgreSQL for production)

## Get API Keys

1. **Google Gemini API Key (Free):**
   - Visit: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy and add to `.env`

2. **OpenRouter API Key (Free tier):**
   - Visit: https://openrouter.ai
   - Sign up and get your API key
   - Copy and add to `.env`

## Troubleshooting

1. **Transcription not working?**
   - Verify GOOGLE_GEMINI_API_KEY is set correctly
   - Check API key at https://aistudio.google.com/app/apikey
   - Ensure you have Gemini API access enabled

2. **Summarization failing?**
   - Verify OPENROUTER_API_KEY is correct
   - Check OpenRouter dashboard for usage limits

3. **Extension can't connect?**
   - Make sure backend is running on port 8000
   - Check browser console for CORS errors
