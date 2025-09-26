# MeetNote Backend

AI-powered meeting recording, transcription, and insights API backend.

## Features

- 🎙️ **Meeting Recording** - Record meetings from various platforms
- 📝 **Real-time Transcription** - Live transcription with speaker detection
- ✨ **AI Insights** - Smart summaries, action items, and highlights using OpenRouter
- 🔗 **Integrations** - Connect with Slack, HubSpot, Salesforce, and more
- 🔒 **Security** - JWT authentication with role-based access control
- 📊 **Analytics** - Meeting analytics and usage tracking

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for session management
- **AI**: OpenRouter API for LLM capabilities
- **Authentication**: JWT + OAuth (Google, Zoom)
- **File Storage**: AWS S3 compatible
- **Real-time**: Socket.IO for live updates
- **Containerization**: Docker & Docker Compose

## Quick Start

### Development with Docker

```bash
# Clone and setup
git clone <repository>
cd backend

# Copy environment file
cp .env.example .env

# Update .env with your API keys:
# - OPENROUTER_API_KEY
# - ASSEMBLY_AI_KEY
# - JWT_SECRET
# - MongoDB and Redis URLs (handled by docker-compose)

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Local Development

```bash
# Install dependencies
npm install

# Setup MongoDB and Redis locally
# Update .env with local connection strings

# Start development server
npm run dev
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Core
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key

# Database
MONGODB_URI=mongodb://localhost:27017/meetnote
REDIS_URL=redis://localhost:6379

# AI Services
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=anthropic/claude-3-sonnet-20240229
ASSEMBLY_AI_KEY=your-assembly-ai-key

# Storage (AWS S3 or compatible)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=meetnote-recordings

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
ZOOM_CLIENT_ID=your-zoom-client-id

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Meetings
- `GET /api/meetings` - List user meetings
- `POST /api/meetings` - Create/start meeting recording
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/:id/stop` - Stop recording
- `DELETE /api/meetings/:id` - Delete meeting

### Transcripts
- `GET /api/transcripts/:meetingId` - Get meeting transcript
- `GET /api/transcripts/:id/export` - Export transcript (txt/srt/vtt)
- `POST /api/transcripts/:id/search` - Search within transcript

### Highlights
- `GET /api/highlights` - List user highlights
- `POST /api/highlights` - Create highlight
- `GET /api/highlights/:id` - Get highlight details
- `POST /api/highlights/:id/share` - Share highlight

### Chrome Extension
- `POST /api/extension/auth` - Extension authentication
- `GET /api/extension/settings` - Get user settings
- `POST /api/extension/settings` - Update settings
- `POST /api/extension/detect-meeting` - Meeting platform detection

## Database Models

### User
- Authentication (email/password, OAuth)
- Subscription management
- Extension settings
- Usage tracking
- Integration credentials

### Meeting
- Platform info (Zoom, Meet, Teams)
- Recording metadata
- Participant management
- AI insights and summaries
- Sharing permissions

### Transcript
- Segmented transcript data
- Speaker diarization
- Searchable text indexing
- Export capabilities
- Analytics data

### Highlight
- Timestamped clips
- AI-generated descriptions
- Sharing capabilities
- User annotations

## AI Features (OpenRouter)

The backend uses OpenRouter for various AI capabilities:

- **Meeting Summaries** - Executive summaries and key points
- **Action Items** - Automatic extraction of tasks and assignments
- **Smart Highlights** - AI-identified important moments
- **Sentiment Analysis** - Meeting tone and engagement analysis
- **Follow-up Suggestions** - Recommended next steps

### Supported Models

- `anthropic/claude-3-sonnet-20240229` (default)
- `openai/gpt-4-turbo-preview`
- `meta-llama/llama-3.1-70b-instruct`
- And many more via OpenRouter

## Deployment

### Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy!

### Docker Deployment

```bash
# Build production image
docker build -t meetnote-backend .

# Run with environment file
docker run -d \
  --name meetnote-api \
  -p 3001:3001 \
  --env-file .env.production \
  meetnote-backend
```

## Performance & Monitoring

- **Health Check**: `GET /health`
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Request Logging**: Morgan middleware
- **Error Tracking**: Structured error responses
- **Security**: Helmet.js security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.