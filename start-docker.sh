#!/bin/bash
set -e

echo "🐳 MeetNote Docker Setup & Start"
echo "================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build and start services
start_services() {
    echo "📦 Building Docker containers..."
    docker-compose build --no-cache

    echo "🚀 Starting MeetNote services..."
    docker-compose up -d

    echo "⏱️  Waiting for services to be ready..."
    sleep 10

    # Check if backend is healthy
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        echo "🌐 Backend available at: http://localhost:8000"
        echo "📊 Health check: http://localhost:8000/api/health"
        echo "💾 Database available at: localhost:5432"
    else
        echo "⚠️  Backend may still be starting up..."
        echo "🔍 Check logs with: docker-compose logs backend"
    fi

    echo ""
    echo "📱 To test the Chrome Extension:"
    echo "1. Update background.js to use: http://localhost:8000"
    echo "2. Load extension in Chrome developer mode"
    echo "3. Join a meeting and test recording"
    echo ""
    echo "🛑 To stop: docker-compose down"
    echo "📊 View logs: docker-compose logs -f"
}

# Function to show logs
show_logs() {
    echo "📊 Showing real-time logs..."
    docker-compose logs -f
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping MeetNote services..."
    docker-compose down
    echo "✅ Services stopped"
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Cleanup complete"
}

# Main menu
case "${1:-start}" in
    "start")
        check_docker
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs
        ;;
    "cleanup")
        cleanup
        ;;
    "restart")
        stop_services
        check_docker
        start_services
        ;;
    *)
        echo "Usage: $0 {start|stop|logs|cleanup|restart}"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start all services (default)"
        echo "  stop     - Stop all services"
        echo "  logs     - Show real-time logs"
        echo "  cleanup  - Stop services and clean up Docker resources"
        echo "  restart  - Restart all services"
        exit 1
        ;;
esac