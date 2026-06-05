from pydantic import BaseModel, Field

from app.schemas.enums import WSEventType
from app.schemas.message import Correction, Message


# ── Client → Server ────────────────────────────────────────────


class WSClientAudioChunk(BaseModel):
    """流式上传音频片段（base64 编码 PCM / webm）。"""

    type: WSEventType = WSEventType.AUDIO_CHUNK
    session_id: str
    chunk: str = Field(..., description="Base64 编码音频数据")
    sequence: int = Field(..., ge=0, description="片段序号，从 0 递增")
    mime_type: str = Field(default="audio/webm", description="音频 MIME 类型")


class WSClientAudioEnd(BaseModel):
    """用户一句话录音结束，触发 STT + 纠错 + LLM 回复。"""

    type: WSEventType = WSEventType.AUDIO_END
    session_id: str
    sequence: int = Field(..., description="最后一个 chunk 的序号")


class WSClientTextInput(BaseModel):
    """可选：文字输入模式（跳过 STT）。"""

    type: WSEventType = WSEventType.TEXT_INPUT
    session_id: str
    text: str = Field(..., min_length=1)


class WSClientPing(BaseModel):
    type: WSEventType = WSEventType.PING


# ── Server → Client ────────────────────────────────────────────


class WSServerTranscript(BaseModel):
    """STT 实时/最终转写结果。"""

    type: WSEventType = WSEventType.TRANSCRIPT
    session_id: str
    text: str
    is_final: bool = False
    message_id: str | None = None


class WSServerAssistantDelta(BaseModel):
    """AI 回复流式 token — 低延迟推送。"""

    type: WSEventType = WSEventType.ASSISTANT_DELTA
    session_id: str
    message_id: str
    delta: str


class WSServerAssistantMessage(BaseModel):
    """AI 文本回复。"""

    type: WSEventType = WSEventType.ASSISTANT_MESSAGE
    session_id: str
    message: Message


class WSServerAssistantAudio(BaseModel):
    """AI 回复的 TTS 音频。"""

    type: WSEventType = WSEventType.ASSISTANT_AUDIO
    session_id: str
    message_id: str
    audio_url: str | None = None
    audio_base64: str | None = Field(
        default=None,
        description="可选：直接推送 base64 音频，避免额外 HTTP 请求",
    )


class WSServerCorrection(BaseModel):
    """
    语法/表达纠错 — 在用户一句话结束后推送。
    可与 assistant_message 并行（异步纠错）或先于 AI 回复（同步纠错）。
    """

    type: WSEventType = WSEventType.CORRECTION
    session_id: str
    message_id: str
    correction: Correction
    pronunciation_score: float | None = Field(default=None, ge=0, le=100)


class WSServerError(BaseModel):
    type: WSEventType = WSEventType.ERROR
    session_id: str | None = None
    code: str
    message: str


class WSServerPong(BaseModel):
    type: WSEventType = WSEventType.PONG


class WSServerSessionEnded(BaseModel):
    type: WSEventType = WSEventType.SESSION_ENDED
    session_id: str
    reason: str = "user_requested"
