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


@app.get("/health/stt")
async def health_stt() -> dict:
    """检测 ASR 配置。"""
    provider = settings.stt_provider
    if provider == "bailian":
        if not (settings.stt_api_key or settings.openai_api_key):
            return {
                "ok": False,
                "provider": "bailian",
                "model": settings.stt_model,
                "error": "STT_API_KEY 未配置",
                "hint": "https://bailian.console.aliyun.com/",
            }
        return {
            "ok": True,
            "provider": "bailian",
            "model": settings.stt_model,
            "language": settings.bailian_asr_language,
        }
    if provider == "sensevoice":
        return {
            "ok": True,
            "provider": "sensevoice",
            "model": settings.sensevoice_model,
            "device": settings.sensevoice_device,
            "hint": "需 pip install funasr；未安装时自动回退 dashscope",
        }
    if provider == "dashscope" and not settings.stt_api_key:
        return {
            "ok": False,
            "provider": provider,
            "error": "STT_API_KEY 未配置",
            "hint": "https://bailian.console.aliyun.com/",
        }
    return {
        "ok": True,
        "provider": provider,
        "model": settings.stt_model,
    }


@app.get("/health/pronunciation")
async def health_pronunciation() -> dict:
    provider = settings.pronunciation_provider.lower()

    if provider == "tencent":
        from app.services.pronunciation_tencent_v2 import _is_configured

        if not _is_configured():
            return {
                "ok": False,
                "provider": "tencent-v2",
                "error": "TENCENT_APP_ID / SECRET_ID / SECRET_KEY 未配置",
                "hint": "https://console.cloud.tencent.com/cam/capi",
            }
        return {
            "ok": True,
            "provider": "tencent-v2",
            "engine": settings.tencent_soe_engine,
            "app_id": settings.tencent_app_id,
        }

    from app.services.pronunciation_azure import _is_configured

    if not _is_configured():
        return {
            "ok": False,
            "provider": "azure",
            "error": "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 未配置",
            "hint": "https://portal.azure.com → Speech 服务",
        }
    return {
        "ok": True,
        "provider": "azure",
        "language": settings.azure_pronunciation_language,
    }


@app.get("/health/tts")
async def health_tts() -> dict:
    provider = settings.tts_provider.lower()
    if provider == "volcano":
        from app.services.tts_volcano import _is_configured

        if not _is_configured():
            return {
                "ok": False,
                "provider": "volcano",
                "error": "VOLCANO_APP_ID / VOLCANO_ACCESS_TOKEN 未配置",
                "hint": "https://console.volcengine.com/speech/service/8",
            }
        return {
            "ok": True,
            "provider": "volcano",
            "voice": settings.volcano_voice_type,
        }
    if not settings.openai_api_key:
        return {"ok": False, "provider": provider, "error": "OPENAI_API_KEY 未配置"}
    return {"ok": True, "provider": provider, "model": settings.tts_model}
