#!/bin/bash
echo "🚀 Starting MeetNote Backend..."
echo "📋 Installing dependencies..."
pip install -r requirements.txt
echo "🌐 Starting server on http://localhost:8000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
