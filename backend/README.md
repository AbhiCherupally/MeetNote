# MeetNote Backend

Clean Python FastAPI backend with Google STT and OpenRouter Mistral 7B for summarization.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Meetings
- `POST /api/meetings/transcribe` - Transcribe audio to text
- `POST /api/meetings/create` - Create meeting with summary
- `GET /api/meetings/` - Get all meetings
- `GET /api/meetings/{id}` - Get specific meeting
- `DELETE /api/meetings/{id}` - Delete meeting

## Architecture

- **STT**: Google Cloud Speech-to-Text API
- **Summarization**: OpenRouter Mistral 7B (free tier)
- **Storage**: In-memory (upgrade to PostgreSQL later)
- **Auth**: Simple demo tokens (upgrade to JWT later)
