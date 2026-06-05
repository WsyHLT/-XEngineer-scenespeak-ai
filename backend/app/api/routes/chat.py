import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.conversation_service import conversation_orchestrator
from app.services.session_store import session_store
from app.services.stream_utils import turn_event_to_sse
from app.services.stt_service import transcribe_audio

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


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    """上传录音文件，返回英文转写文本（Whisper / Groq STT）。"""
    if not file.content_type or not file.content_type.startswith("audio"):
        # 部分浏览器上传 webm 时 content_type 可能为空，仍尝试处理
        pass
    try:
        audio_bytes = await file.read()
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="录音太短，请按住按钮多说几句")
        text = await transcribe_audio(audio_bytes, file.filename or "audio.webm")
        return TranscribeResponse(text=text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("STT failed")
        detail = str(exc)
        if "does not support" in detail.lower() or "not found" in detail.lower():
            detail = (
                "DeepSeek 不支持语音转文字。请在 .env 单独配置 Groq Whisper："
                "STT_API_KEY + STT_BASE_URL=https://api.groq.com/openai/v1"
            )
        raise HTTPException(status_code=502, detail=detail) from exc


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
