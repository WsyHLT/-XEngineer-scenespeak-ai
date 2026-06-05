from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="SceneSpeak AI",
    description="Real-time English speaking practice with STT, LLM, TTS, and pronunciation feedback.",
    version="0.1.0",
)

app.openapi_tags = [
    {"name": "scenes", "description": "练习场景"},
    {"name": "session", "description": "会话管理与课后报告"},
    {"name": "chat", "description": "流式对话（SSE）与 WebSocket"},
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root() -> dict:
    """API 服务入口 — 前端 UI 请访问 http://localhost:3000"""
    return {
        "service": "SceneSpeak AI Backend",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "api": {
            "scenes": "/api/scenes",
            "start_session": "POST /api/session/start",
            "chat_sse": "POST /api/chat/message",
        },
        "frontend": "http://localhost:3000",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/llm")
async def health_llm() -> dict:
    """快速检测 LLM API 是否可达（用于排查 Request timed out）。"""
    from app.services.llm_client import get_llm_client

    if not settings.openai_api_key:
        return {"ok": False, "error": "OPENAI_API_KEY 未配置"}

    llm = get_llm_client()
    try:
        text = ""
        async for chunk in llm.stream_chat(
            [{"role": "user", "content": "Reply with exactly: ok"}],
            max_tokens=8,
        ):
            text += chunk
        return {"ok": True, "model": settings.llm_model, "sample": text.strip()[:50]}
    except Exception as exc:
        return {"ok": False, "model": settings.llm_model, "error": str(exc)}
