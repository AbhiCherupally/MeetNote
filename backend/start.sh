#!/bin/bash

echo "🚀 Starting MeetNote Backend with your API keys..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting MongoDB and Redis containers..."
docker-compose up -d mongo redis

echo "⏳ Waiting for databases to be ready..."
sleep 5

echo "🔧 Installing dependencies..."
npm install

echo "📊 Starting MeetNote API server..."
echo "   - OpenRouter: Mistral 7B Instruct (Free)"
echo "   - Assembly AI: Transcription service"
echo "   - MongoDB: Local database"
echo "   - Redis: Session storage"
echo ""

npm run dev