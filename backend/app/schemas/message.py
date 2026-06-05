from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import CorrectionSeverity, CorrectionType, MessageRole


class Correction(BaseModel):
    """单条语法/表达纠错 — 在用户一句话结束后返回。"""

    original: str = Field(..., description="用户原始表达")
    corrected: str = Field(..., description="推荐修正表达")
    explanation: str = Field(..., description="纠错说明（中文或英文）")
    correction_type: CorrectionType = Field(..., description="纠错类型")
    severity: CorrectionSeverity = Field(
        default=CorrectionSeverity.MINOR,
        description="问题严重程度",
    )


class Message(BaseModel):
    """单条对话记录。"""

    id: str = Field(..., description="消息 UUID")
    session_id: str = Field(..., description="所属会话 ID")
    role: MessageRole = Field(..., description="发言角色")
    content: str = Field(..., description="文本内容（STT 结果或 LLM 回复）")
    audio_url: str | None = Field(
        default=None,
        description="音频文件 URL（用户录音或 TTS 合成）",
    )
    correction: Correction | None = Field(
        default=None,
        description="纠错提示，仅 user 消息且检测到问题时填充",
    )
    pronunciation_score: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="该句发音得分（0-100），仅 user 消息",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MessageListResponse(BaseModel):
    session_id: str
    messages: list[Message]
    total: int
