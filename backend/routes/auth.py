from fastapi import APIRouter, HTTPException
import uuid
from datetime import datetime
import hashlib

from models.user import UserCreate, UserLogin, Token, User
from services.storage import storage_service

router = APIRouter()

def hash_password(password: str) -> str:
    """Simple password hashing (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user exists
        existing_user = await storage_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "password": hash_password(user_data.password),
            "created_at": datetime.now().isoformat()
        }
        
        await storage_service.create_user(user)
        
        # Return token (simple demo token)
        user_response = User(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user["created_at"]
        )
        
        return Token(
            access_token=f"demo_token_{user_id}",
            token_type="bearer",
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(credentials: UserLogin):
    """Login user"""
    try:
        # Find user
        user = await storage_service.get_user_by_email(credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check password
        if user["password"] != hash_password(credentials.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Return token
        user_response = User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
        
        return Token(
            access_token=f"demo_token_{user['id']}",
            token_type="bearer",
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_current_user():
    """Get current user (demo)"""
    return {
        "id": "demo-user",
        "email": "demo@example.com",
        "name": "Demo User"
    }
