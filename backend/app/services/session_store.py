import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from app.schemas.enums import MessageRole, SceneId, SessionStatus
from app.schemas.message import Correction, Message
from app.schemas.session import CorrectionRecord
from app.services.coach_service import coach_service, correction_service

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ConversationSession:
    session_id: str
    scene_id: SceneId
    status: SessionStatus = SessionStatus.ACTIVE
    messages: list[Message] = field(default_factory=list)
    corrections: list[CorrectionRecord] = field(default_factory=list)
    started_at: datetime = field(default_factory=_utcnow)
    turn_count: int = 0


class SessionStore:
    """内存会话存储 — Demo 阶段足够，后续可换 Redis / DB。"""

    def __init__(self) -> None:
        self._sessions: dict[str, ConversationSession] = {}

    def create(self, scene_id: SceneId) -> ConversationSession:
        session = ConversationSession(
            session_id=str(uuid.uuid4()),
            scene_id=scene_id,
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> ConversationSession | None:
        return self._sessions.get(session_id)

    def require(self, session_id: str) -> ConversationSession:
        session = self.get(session_id)
        if session is None:
            raise KeyError(f"Session not found: {session_id}")
        return session

    def end(self, session_id: str) -> ConversationSession:
        session = self.require(session_id)
        session.status = SessionStatus.ENDED
        return session


session_store = SessionStore()
