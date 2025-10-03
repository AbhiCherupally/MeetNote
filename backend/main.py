from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from routes.meetings import router as meetings_router
from routes.auth import router as auth_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Backend starting up...")
    yield
    print("👋 Backend shutting down...")

app = FastAPI(
    title="MeetNote API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(meetings_router, prefix="/api/meetings", tags=["meetings"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "MeetNote API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
