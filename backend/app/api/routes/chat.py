import json
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.schemas.pronunciation import PronunciationAssessment
from app.services.conversation_service import conversation_orchestrator
from app.services.pronunciation_service import assess_pronunciation
from app.services.session_store import session_store
from app.services.stream_utils import turn_event_to_sse
from app.services.stt_service import transcribe_audio
from app.services.translation_service import translate_en_to_zh
from app.services.tts_service import synthesize_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessageRequest(BaseModel):
    session_id: str = Field(..., description="会话 ID")
    text: str = Field(..., min_length=1, description="用户文本（跳过 STT 的调试入口）")


class SessionInitRequest(BaseModel):
    session_id: str
    use_llm_opening: bool = Field(
        default=False,
        description="True=LLM 流式生成开场；False=静态开场（零延迟）",
    )


class TranscribeResponse(BaseModel):
    text: str
    asr_engine: str = Field(description="ASR 提供方：bailian / sensevoice / dashscope / openai")


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="待合成英文文本")
    voice_id: str | None = Field(
        default=None,
        description="火山 TTS voice_type 或 OpenAI voice 名，不传则用默认",
    )


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000, description="待翻译英文")


class TranslateResponse(BaseModel):
    translation_zh: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    """路线 B · 听：上传录音 → 百炼 Qwen-ASR / 备选 SenseVoice / Paraformer。"""
    if not file.content_type or not file.content_type.startswith("audio"):
        # 部分浏览器上传 webm 时 content_type 可能为空，仍尝试处理
        pass
    audio_bytes = b""
    try:
        audio_bytes = await file.read()
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="录音太短，请按住按钮多说几句")
        text = await transcribe_audio(audio_bytes, file.filename or "audio.webm")
        return TranscribeResponse(text=text, asr_engine=settings.stt_provider)
    except ValueError as exc:
        logger.warning(
            "STT 400: %s (size=%d bytes, file=%s)",
            exc,
            len(audio_bytes),
            file.filename,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("STT failed")
        detail = str(exc)
        if "403" in detail or "Forbidden" in detail:
            detail = (
                "Groq/OpenAI STT 返回 403。国内请改用 DashScope："
                "STT_PROVIDER=dashscope + STT_API_KEY=百炼Key"
            )
        elif "DashScope" in detail or "dashscope" in detail.lower():
            pass
        elif "does not support" in detail.lower():
            detail = (
                "DeepSeek 不支持语音转文字。请单独配置 Groq："
                "STT_API_KEY + STT_BASE_URL=https://api.groq.com/openai/v1"
            )
        raise HTTPException(status_code=502, detail=detail) from exc


@router.post("/assess-pronunciation", response_model=PronunciationAssessment)
async def assess_pronunciation_route(
    file: UploadFile = File(...),
    reference_text: str = Form(...),
) -> PronunciationAssessment:
    """
    路线 B · 评测：腾讯云智聆 SOE（新版 WebSocket）。
    需传入用户确认后的参考文本 + 同一段录音。
    """
    if not reference_text.strip():
        raise HTTPException(status_code=400, detail="reference_text 不能为空")
    audio_bytes = await file.read()
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="录音太短")
    try:
        return await assess_pronunciation(
            audio_bytes,
            reference_text.strip(),
            file.filename or "audio.webm",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ImportError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Pronunciation assessment failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/synthesize")
async def synthesize(body: SynthesizeRequest) -> Response:
    """路线 B · 说：文本 → 火山引擎 TTS（或 OpenAI 备选）→ 返回音频。"""
    try:
        audio_bytes, content_type = await synthesize_speech(body.text, voice_id=body.voice_id)
        return Response(content=audio_bytes, media_type=content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("TTS failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/translate", response_model=TranslateResponse)
async def translate(body: TranslateRequest) -> TranslateResponse:
    """AI 回复英文 → 简体中文翻译。"""
    try:
        zh = await translate_en_to_zh(body.text)
        return TranslateResponse(translation_zh=zh)
    except Exception as exc:
        logger.exception("Translation failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/init")
async def init_conversation(body: SessionInitRequest) -> StreamingResponse:
    """
    推送 AI 开场白（SSE）。
    会话创建后调用一次，再进入正常对话轮次。
    """
    session = session_store.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def generate():
        try:
            async for event in conversation_orchestrator.initialize_session(
                session,
                use_llm_opening=body.use_llm_opening,
            ):
                yield turn_event_to_sse(event)
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Init conversation failed")
            err = json.dumps({"error": str(exc)})
            yield f"data: {err}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/message")
async def send_message(body: ChatMessageRequest) -> StreamingResponse:
    """
    处理一轮用户发言（SSE 流式返回）。

    事件顺序：
      user_message → assistant_delta×N → assistant_done → correction?（并行纠错，可能稍后到达）
    """
    session = session_store.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def generate():
        try:
            async for event in conversation_orchestrator.process_user_turn(
                body.session_id,
                body.text,
            ):
                yield turn_event_to_sse(event)
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Process turn failed")
            err = json.dumps({"error": str(exc)})
            yield f"data: {err}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
