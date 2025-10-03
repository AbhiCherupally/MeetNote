from typing import List, Optional, Dict
from datetime import datetime
import os
import json

# Try to import PostgreSQL dependencies
try:
    from database import SessionLocal, MeetingDB, UserDB, init_db
    POSTGRES_ENABLED = bool(os.getenv("DATABASE_URL"))
except ImportError:
    POSTGRES_ENABLED = False
    print("⚠️  PostgreSQL dependencies not installed, using in-memory storage")

# In-memory storage fallback
meetings_db: Dict[str, dict] = {}
users_db: Dict[str, dict] = {}

class StorageService:
    def __init__(self):
        self.use_postgres = POSTGRES_ENABLED
        if self.use_postgres:
            try:
                init_db()
                print("✅ Using PostgreSQL database")
            except Exception as e:
                print(f"⚠️  PostgreSQL connection failed: {e}")
                self.use_postgres = False
                print("📦 Falling back to in-memory storage")
        else:
            print("📦 Using in-memory storage")
    
    async def create_meeting(self, meeting_data: dict) -> dict:
        """Store a meeting"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                meeting = MeetingDB(
                    id=meeting_data["id"],
                    title=meeting_data["title"],
                    date=meeting_data["date"],
                    transcript=meeting_data["transcript"],
                    summary=meeting_data.get("summary"),
                    action_items=meeting_data.get("action_items"),
                    user_id=meeting_data["user_id"]
                )
                db.add(meeting)
                db.commit()
                db.refresh(meeting)
                return meeting_data
            finally:
                db.close()
        else:
            meeting_id = meeting_data["id"]
            meetings_db[meeting_id] = meeting_data
            return meeting_data
    
    async def get_meeting(self, meeting_id: str) -> Optional[dict]:
        """Retrieve a meeting by ID"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                meeting = db.query(MeetingDB).filter(MeetingDB.id == meeting_id).first()
                if meeting:
                    return {
                        "id": meeting.id,
                        "title": meeting.title,
                        "date": meeting.date,
                        "transcript": meeting.transcript,
                        "summary": meeting.summary,
                        "action_items": meeting.action_items,
                        "created_at": meeting.created_at.isoformat(),
                        "user_id": meeting.user_id
                    }
                return None
            finally:
                db.close()
        else:
            return meetings_db.get(meeting_id)
    
    async def get_user_meetings(self, user_id: str) -> List[dict]:
        """Get all meetings for a user"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                meetings = db.query(MeetingDB).filter(MeetingDB.user_id == user_id).all()
                return [{
                    "id": m.id,
                    "title": m.title,
                    "date": m.date,
                    "transcript": m.transcript,
                    "summary": m.summary,
                    "action_items": m.action_items,
                    "created_at": m.created_at.isoformat(),
                    "user_id": m.user_id
                } for m in meetings]
            finally:
                db.close()
        else:
            return [
                meeting for meeting in meetings_db.values()
                if meeting.get("user_id") == user_id
            ]
    
    async def update_meeting(self, meeting_id: str, updates: dict) -> Optional[dict]:
        """Update a meeting"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                meeting = db.query(MeetingDB).filter(MeetingDB.id == meeting_id).first()
                if meeting:
                    for key, value in updates.items():
                        setattr(meeting, key, value)
                    db.commit()
                    return await self.get_meeting(meeting_id)
                return None
            finally:
                db.close()
        else:
            if meeting_id in meetings_db:
                meetings_db[meeting_id].update(updates)
                return meetings_db[meeting_id]
            return None
    
    async def delete_meeting(self, meeting_id: str) -> bool:
        """Delete a meeting"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                meeting = db.query(MeetingDB).filter(MeetingDB.id == meeting_id).first()
                if meeting:
                    db.delete(meeting)
                    db.commit()
                    return True
                return False
            finally:
                db.close()
        else:
            if meeting_id in meetings_db:
                del meetings_db[meeting_id]
                return True
            return False
    
    async def create_user(self, user_data: dict) -> dict:
        """Create a new user"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                user = UserDB(
                    id=user_data["id"],
                    email=user_data["email"],
                    name=user_data["name"],
                    password=user_data["password"]
                )
                db.add(user)
                db.commit()
                return user_data
            finally:
                db.close()
        else:
            user_id = user_data["id"]
            users_db[user_id] = user_data
            return user_data
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                user = db.query(UserDB).filter(UserDB.email == email).first()
                if user:
                    return {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "password": user.password,
                        "created_at": user.created_at.isoformat()
                    }
                return None
            finally:
                db.close()
        else:
            for user in users_db.values():
                if user.get("email") == email:
                    return user
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        if self.use_postgres:
            db = SessionLocal()
            try:
                user = db.query(UserDB).filter(UserDB.id == user_id).first()
                if user:
                    return {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "password": user.password,
                        "created_at": user.created_at.isoformat()
                    }
                return None
            finally:
                db.close()
        else:
            return users_db.get(user_id)

storage_service = StorageService()
