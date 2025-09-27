#!/usr/bin/env python3
"""
MeetNote Backend Startup Script
Starts the Python FastAPI backend with proper configuration
"""

import os
import sys
import subprocess
import platform

def setup_environment():
    """Set up environment variables"""
    env_vars = {
        'ASSEMBLYAI_API_KEY': '598c0c5952444246ba2c1af3eb010d0b',
        'JWT_SECRET_KEY': 'meetnote_dev_secret_key_12345',
        'ENVIRONMENT': 'development',
        'PORT': '8000'
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
            print(f"✅ Set {key}")

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'backend/requirements.txt'], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def start_backend():
    """Start the Python backend"""
    print("🚀 Starting MeetNote Python Backend...")
    
    # Change to backend directory
    os.chdir('backend')
    
    try:
        # Start with uvicorn
        cmd = [
            sys.executable, 
            '-m', 
            'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0',
            '--port', '8000',
            '--reload'
        ]
        
        print(f"Running: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start backend: {e}")
        return False
    except KeyboardInterrupt:
        print("\n👋 Shutting down backend...")
        return True
    
    return True

def main():
    """Main startup function"""
    print("🎯 MeetNote Backend Startup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists('backend/main.py'):
        print("❌ Please run this script from the MeetNote project root directory")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Start backend
    if not start_backend():
        sys.exit(1)
    
    print("✅ Backend started successfully!")

if __name__ == "__main__":
    main()