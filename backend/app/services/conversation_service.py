"""
对话编排器 — 核心机制：

  用户发言
     │
     ├─► asyncio.create_task(correction)   ← 并行启动，不阻塞
     │
     └─► coach.stream_reply()              ← 立即流式返回 AI 回复
              │
              ▼
         assistant 流结束 → 持久化消息
              │
              ▼
         await correction_task              ← 纠错完成后附加推送
"""

import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from app.schemas.enums import MessageRole, SceneId
from app.schemas.message import Correction, Message
from app.schemas.session import CorrectionRecord
from app.services.coach_service import coach_service, correction_service
from app.services.session_store import ConversationSession, session_store

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class TurnEvent:
    """单轮对话产出的事件 — 供 WebSocket / SSE 层转发。"""

    kind: Literal[
        "user_message",
        "assistant_delta",
        "assistant_done",
        "correction",
    ]
    session_id: str
    message_id: str
    # kind-specific payloads
    delta: str | None = None
    message: Message | None = None
    correction: Correction | None = None


class ConversationOrchestrator:
    """
    编排「流式陪练 + 并行纠错」：

    1. 记录 user message
    2. 后台启动 correction_task（asyncio.create_task）
    3. 立即 stream coach reply → yield assistant_delta events
    4. stream 结束 → yield assistant_done，写入 history
    5. await correction_task → 若有纠错 yield correction event
    """

    async def initialize_session(
        self,
        session: ConversationSession,
        *,
        use_llm_opening: bool = False,
    ) -> AsyncIterator[TurnEvent]:
        """会话冷启动：插入 AI 开场白（静态或 LLM 流式）。"""
        message_id = str(uuid.uuid4())
        session_id = session.session_id

        if use_llm_opening:
            content_parts: list[str] = []
            async for delta in coach_service.stream_opening(session.scene_id):
                content_parts.append(delta)
                yield TurnEvent(
                    kind="assistant_delta",
                    session_id=session_id,
                    message_id=message_id,
                    delta=delta,
                )
            content = "".join(content_parts)
        else:
            content = coach_service.get_static_opening(session.scene_id)
            yield TurnEvent(
                kind="assistant_delta",
                session_id=session_id,
                message_id=message_id,
                delta=content,
            )

        assistant_msg = Message(
            id=message_id,
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=content,
            created_at=_utcnow(),
        )
        session.messages.append(assistant_msg)

        yield TurnEvent(
            kind="assistant_done",
            session_id=session_id,
            message_id=message_id,
            message=assistant_msg,
        )

    async def process_user_turn(
        self,
        session_id: str,
        user_text: str,
    ) -> AsyncIterator[TurnEvent]:
        session = session_store.require(session_id)
        user_message_id = str(uuid.uuid4())
        assistant_message_id = str(uuid.uuid4())

        user_msg = Message(
            id=user_message_id,
            session_id=session_id,
            role=MessageRole.USER,
            content=user_text,
            created_at=_utcnow(),
        )
        session.messages.append(user_msg)
        session.turn_count += 1

        yield TurnEvent(
            kind="user_message",
            session_id=session_id,
            message_id=user_message_id,
            message=user_msg,
        )

        # ── 并行：纠错不阻塞陪练回复 ──
        history_before_current = session.messages[:-1]
        correction_task = correction_service.analyze_background(
            user_text, session.scene_id
        )

        # ── 流式：AI 陪练立即响应 ──
        content_parts: list[str] = []
        try:
            async for delta in coach_service.stream_reply(
                session.scene_id,
                history_before_current,
                user_text,
            ):
                content_parts.append(delta)
                yield TurnEvent(
                    kind="assistant_delta",
                    session_id=session_id,
                    message_id=assistant_message_id,
                    delta=delta,
                )
        except Exception:
            logger.exception("Coach stream failed for session %s", session_id)
            correction_task.cancel()
            raise

        assistant_content = "".join(content_parts)
        assistant_msg = Message(
            id=assistant_message_id,
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_content,
            created_at=_utcnow(),
        )
        session.messages.append(assistant_msg)

        yield TurnEvent(
            kind="assistant_done",
            session_id=session_id,
            message_id=assistant_message_id,
            message=assistant_msg,
        )

        # ── 纠错完成后附加（通常 AI 回复已结束）──
        try:
            correction = await correction_task
        except Exception:
            logger.exception("Correction task failed for session %s", session_id)
            correction = None

        if correction:
            user_msg.correction = correction
            session.corrections.append(
                CorrectionRecord(
                    message_id=user_message_id,
                    turn_index=session.turn_count,
                    user_utterance=user_text,
                    correction=correction,
                )
            )
            yield TurnEvent(
                kind="correction",
                session_id=session_id,
                message_id=user_message_id,
                correction=correction,
            )


conversation_orchestrator = ConversationOrchestrator()
