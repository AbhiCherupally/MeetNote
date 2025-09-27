#!/usr/bin/env python3
"""
MeetNote Development Server
Fast startup script for development environment
"""

import os
import subprocess
import sys
from pathlib import Path

def check_requirements():
    """Check if required packages are installed"""
    try:
        import fastapi
        import uvicorn
        import assemblyai
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        print("Installing requirements...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        return False

def setup_environment():
    """Setup environment variables"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found, using defaults")
        # Set basic environment
        os.environ.setdefault("PORT", "8000")
        os.environ.setdefault("ENVIRONMENT", "development")
    else:
        # Load environment variables from .env file
        with open(env_file) as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ.setdefault(key, value)

def main():
    print("🚀 Starting MeetNote Python Backend Server...")
    
    # Check and install requirements
    if not check_requirements():
        print("📦 Dependencies installed, please restart the server")
        return
    
    # Setup environment
    setup_environment()
    
    # Get configuration
    port = int(os.getenv("PORT", 8000))
    environment = os.getenv("ENVIRONMENT", "development")
    
    print(f"🌍 Environment: {environment}")
    print(f"🔌 Port: {port}")
    
    # Check AssemblyAI configuration
    if not os.getenv("ASSEMBLYAI_API_KEY"):
        print("⚠️  ASSEMBLYAI_API_KEY not configured - transcription will not work")
        print("   Please set your API key in the .env file")
    else:
        print("✅ AssemblyAI configured")
    
    print(f"🌐 Server will be available at: http://localhost:{port}")
    print("📖 API Documentation: http://localhost:{port}/docs")
    print("🔍 Health Check: http://localhost:{port}/api/health")
    
    # Start server
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=environment == "development",
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()