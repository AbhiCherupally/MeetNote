"""
Configuration settings for MeetNote Backend
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "MeetNote"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # API
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./meetnote.db"  # Default to SQLite for development
    )
    
    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-this-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenRouter API (for Mistral 7B summarization)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "mistralai/mistral-7b-instruct:free"
    
    # Whisper Settings
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")  # cpu or cuda
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # int8, float16, float32
    
    # Audio Settings
    SAMPLE_RATE: int = 16000
    CHUNK_DURATION: int = 5  # seconds
    MAX_AUDIO_SIZE: int = 25 * 1024 * 1024  # 25MB
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "https://meetnoteapp.netlify.app",
    ]
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    RECORDINGS_DIR: str = "./recordings"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Create necessary directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
