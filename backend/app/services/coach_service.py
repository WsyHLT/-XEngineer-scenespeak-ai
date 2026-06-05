import asyncio
import logging
from collections.abc import AsyncIterator

from app.schemas.enums import CorrectionSeverity, CorrectionType, SceneId
from app.schemas.message import Correction, Message
from app.services.llm_client import get_llm_client
from app.services.prompt_manager import prompt_manager

logger = logging.getLogger(__name__)


class CoachService:
    """AI 陪练 — 流式对话回复，不包含纠错逻辑。"""

    async def stream_reply(
        self,
        scene_id: SceneId,
        history: list[Message],
        user_text: str,
    ) -> AsyncIterator[str]:
        messages = prompt_manager.build_coach_messages(scene_id, history, user_text)
        llm = get_llm_client()

        async for delta in llm.stream_chat(messages):
            yield delta

    async def stream_opening(self, scene_id: SceneId) -> AsyncIterator[str]:
        """可选：LLM 生成开场白（比静态开场更灵活，但多一次调用）。"""
        messages = prompt_manager.build_opening_messages(scene_id)
        llm = get_llm_client()

        async for delta in llm.stream_chat(messages):
            yield delta

    def get_static_opening(self, scene_id: SceneId) -> str:
        return prompt_manager.get_static_opening(scene_id)


class CorrectionService:
    """
    纠错服务 — 独立 LLM 调用，与陪练回复并行执行。
    使用较小 temperature + JSON mode 保证结构化输出。
    """

    async def analyze(
        self,
        user_text: str,
        scene_id: SceneId,
    ) -> Correction | None:
        messages = prompt_manager.build_correction_messages(user_text, scene_id)
        llm = get_llm_client()

        try:
            data = await llm.complete_json(messages)
        except Exception:
            logger.exception("Correction LLM call failed")
            return None

        return self._parse_correction(data, user_text)

    def analyze_background(
        self,
        user_text: str,
        scene_id: SceneId,
    ) -> asyncio.Task[Correction | None]:
        """创建后台 Task，供 orchestrator 与 stream 并行。"""
        return asyncio.create_task(self.analyze(user_text, scene_id))

    @staticmethod
    def _parse_correction(data: dict, user_text: str) -> Correction | None:
        if not data.get("has_issue"):
            return None

        original = data.get("original") or user_text
        corrected = data.get("corrected")
        explanation = data.get("explanation")

        if not corrected or not explanation:
            return None

        try:
            correction_type = CorrectionType(data.get("correction_type", "grammar"))
        except ValueError:
            correction_type = CorrectionType.GRAMMAR

        try:
            severity = CorrectionSeverity(data.get("severity", "minor"))
        except ValueError:
            severity = CorrectionSeverity.MINOR

        return Correction(
            original=original,
            corrected=corrected,
            explanation=explanation,
            correction_type=correction_type,
            severity=severity,
        )


coach_service = CoachService()
correction_service = CorrectionService()
