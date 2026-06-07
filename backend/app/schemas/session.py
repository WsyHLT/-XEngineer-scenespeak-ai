from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import SceneId, SessionStatus
from app.schemas.message import Correction, Message
from app.schemas.scene import Scene


class SessionStartRequest(BaseModel):
    scene_id: SceneId = Field(..., description="选择的练习场景")


class SessionStartResponse(BaseModel):
    session_id: str
    scene: Scene
    status: SessionStatus = SessionStatus.ACTIVE
    started_at: datetime
    websocket_url: str = Field(
        ...,
        description="该会话对应的 WebSocket 连接地址",
        examples=["ws://localhost:8000/api/chat/ws?session_id=abc-123"],
    )


class SessionInfo(BaseModel):
    session_id: str
    scene_id: SceneId
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    turn_count: int = 0


class ScoreBreakdown(BaseModel):
    """多维度评分（0-100）。"""

    pronunciation: float = Field(..., ge=0, le=100, description="发音准确度")
    grammar: float = Field(..., ge=0, le=100, description="语法正确性")
    fluency: float = Field(..., ge=0, le=100, description="流利度")
    vocabulary: float = Field(..., ge=0, le=100, description="词汇运用")
    coherence: float = Field(..., ge=0, le=100, description="连贯性与逻辑")
    overall: float = Field(..., ge=0, le=100, description="综合得分")


class CorrectionRecord(BaseModel):
    """课后总结中的纠错条目 — 关联到具体对话轮次。"""

    message_id: str
    turn_index: int = Field(..., ge=1, description="第几轮用户发言")
    user_utterance: str
    correction: Correction


class ImprovementSuggestion(BaseModel):
    """可量化的提升建议。"""

    area: str = Field(..., description="提升领域，如 pronunciation / grammar")
    current_score: float = Field(..., ge=0, le=100)
    target_score: float = Field(..., ge=0, le=100)
    suggestion: str = Field(..., description="具体练习建议")
    priority: int = Field(..., ge=1, le=5, description="优先级，1 最高")


class SessionReport(BaseModel):
    """课后总结报告。"""

    session_id: str
    scene_id: SceneId
    scene_name: str
    scores: ScoreBreakdown
    corrections: list[CorrectionRecord] = Field(
        default_factory=list,
        description="本次练习全部纠错列表",
    )
    suggestions: list[ImprovementSuggestion] = Field(
        default_factory=list,
        description="量化提升建议",
    )
    summary: str = Field(..., description="综合文字反馈")
    highlights: list[str] = Field(
        default_factory=list,
        description="表现亮点",
    )
    total_turns: int = Field(..., ge=0)
    duration_seconds: int = Field(..., ge=0)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SessionEndRequest(BaseModel):
    """主动结束会话并触发报告生成。"""

    generate_report: bool = True


class SessionEndResponse(BaseModel):
    session_id: str
    status: SessionStatus
    report: SessionReport | None = None
