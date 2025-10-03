#!/bin/bash

echo "🐳 MeetNote Docker Startup"
echo "=========================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.docker .env
    echo "✅ Created .env file. Please edit it with your API keys:"
    echo "   - OPENROUTER_API_KEY"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if API keys are set in .env
if ! grep -q "GOOGLE_GEMINI_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo "⚠️  GOOGLE_GEMINI_API_KEY not set in .env!"
    echo "   Get your free API key from: https://aistudio.google.com/app/apikey"
    echo ""
fi

if ! grep -q "OPENROUTER_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo "⚠️  OPENROUTER_API_KEY not set in .env!"
    echo "   Get your free API key from: https://openrouter.ai"
    echo ""
fi

# Build and start
echo "🔨 Building Docker containers..."
docker-compose build

echo ""
echo "🚀 Starting MeetNote backend..."
docker-compose up -d

echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Check health
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo ""
    echo "✅ MeetNote backend is running!"
    echo ""
    echo "📍 API: http://localhost:8000"
    echo "📖 Docs: http://localhost:8000/docs"
    echo ""
    echo "💡 Useful commands:"
    echo "   docker-compose logs -f       # View logs"
    echo "   docker-compose down          # Stop services"
    echo "   docker-compose restart       # Restart services"
else
    echo ""
    echo "⚠️  Backend may not be ready yet. Check logs:"
    echo "   docker-compose logs -f backend"
fi
