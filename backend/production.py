#!/usr/bin/env python3
"""
Production startup script for MeetNote Python Backend
Optimized for Render.com deployment
"""

import os
import sys
import logging
from pathlib import Path

def setup_production_logging():
    """Configure logging for production environment"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def validate_environment():
    """Validate required environment variables"""
    required_vars = ['PORT']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
    
    # Warn about optional but recommended variables
    if not os.getenv('ASSEMBLYAI_API_KEY'):
        print("⚠️  ASSEMBLYAI_API_KEY not set - transcription features will be disabled")
    
    print("✅ Environment validation passed")

def main():
    """Main entry point for production server"""
    print("🚀 Starting MeetNote Production Server...")
    
    # Setup logging
    setup_production_logging()
    
    # Validate environment
    validate_environment()
    
    # Get configuration
    port = int(os.getenv('PORT', 10000))
    workers = int(os.getenv('WORKERS', 1))
    
    print(f"🌍 Environment: production")
    print(f"🔌 Port: {port}")
    print(f"👥 Workers: {workers}")
    print(f"📊 Health Check: /api/health")
    
    # Start server with uvicorn
    try:
        import uvicorn
        
        # Production configuration
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            workers=workers,
            log_level="info",
            access_log=True,
            loop="uvloop",  # High-performance event loop
            http="httptools"  # High-performance HTTP parser
        )
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("💡 Install with: pip install uvicorn[standard]")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()