from fastapi import APIRouter

from app.api.routes import chat, scenes, session

api_router = APIRouter()
api_router.include_router(scenes.router)
api_router.include_router(session.router)
api_router.include_router(chat.router)
