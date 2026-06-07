import logging
from datetime import datetime, timezone

from app.data.scenes import get_scene_by_id
from app.prompts.report_prompt import REPORT_SYSTEM_PROMPT
from app.schemas.enums import SceneId
from app.schemas.session import (
    ImprovementSuggestion,
    ScoreBreakdown,
    SessionReport,
)
from app.services.llm_client import ChatMessage, get_llm_client
from app.services.session_store import ConversationSession

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _heuristic_scores(session: ConversationSession) -> ScoreBreakdown:
    """LLM 不可用时的保底评分 — 仍基于真实纠错数据。"""
    severity_weight = {"minor": 1, "moderate": 2, "major": 3}
    penalty = sum(
        severity_weight.get(str(c.correction.severity.value), 1)
        for c in session.corrections
    )
    grammar = max(40.0, min(98.0, 92.0 - penalty * 4))
    pronunciation = max(50.0, min(95.0, 88.0 - (penalty // 2) * 3))
    fluency = max(45.0, min(92.0, 85.0 - session.turn_count * 0.5))
    vocabulary = max(50.0, min(90.0, 80.0 - penalty * 2))
    coherence = max(45.0, min(92.0, (fluency + grammar) / 2 - penalty))
    overall = round((grammar + pronunciation + fluency + vocabulary + coherence) / 5)
    return ScoreBreakdown(
        pronunciation=round(pronunciation),
        grammar=round(grammar),
        fluency=round(fluency),
        vocabulary=round(vocabulary),
        coherence=round(coherence),
        overall=float(overall),
    )


def _build_user_payload(session: ConversationSession) -> str:
    lines = [
        f"Scene: {session.scene_id.value}",
        f"Total turns: {session.turn_count}",
        f"Corrections count: {len(session.corrections)}",
    ]
    if session.corrections:
        lines.append("\nCorrections:")
        for c in session.corrections[:12]:
            lines.append(
                f'- Turn {c.turn_index}: "{c.user_utterance}" → '
                f'"{c.correction.corrected}" ({c.correction.correction_type.value})'
            )
    else:
        lines.append("No corrections recorded — learner performed well.")
    return "\n".join(lines)


class ReportService:
    async def generate_report(self, session: ConversationSession) -> SessionReport:
        scene = get_scene_by_id(session.scene_id)
        scene_name = scene.name_zh if scene else session.scene_id.value
        duration = int((_utcnow() - session.started_at).total_seconds())

        scores = await self._llm_scores(session)
        if scores is None:
            scores = _heuristic_scores(session)

        summary, highlights, suggestions = await self._llm_feedback(session, scores)
        if not summary:
            summary = (
                "本次练习表现优秀，表达流畅且语法准确，继续保持！"
                if not session.corrections
                else f"共完成 {session.turn_count} 轮对话，发现 {len(session.corrections)} 处可改进表达。"
            )
        if not highlights:
            highlights = (
                ["对话参与度 high", "能完成场景核心任务"]
                if len(session.corrections) < 3
                else ["勇于开口表达", "基本完成场景对话"]
            )
        if not suggestions:
            suggestions = [
                ImprovementSuggestion(
                    area="grammar",
                    current_score=scores.grammar,
                    target_score=min(95.0, scores.grammar + 15),
                    suggestion="练习使用正确的时态和介词搭配，录音后复述修正句。",
                    priority=1 if scores.grammar < 75 else 3,
                ),
            ]

        return SessionReport(
            session_id=session.session_id,
            scene_id=session.scene_id,
            scene_name=scene_name,
            scores=scores,
            corrections=session.corrections,
            suggestions=suggestions,
            summary=summary,
            highlights=highlights,
            total_turns=session.turn_count,
            duration_seconds=max(0, duration),
            generated_at=_utcnow(),
        )

    async def _llm_scores(self, session: ConversationSession) -> ScoreBreakdown | None:
        messages: list[ChatMessage] = [
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_payload(session)},
        ]
        try:
            llm = get_llm_client()
            data = await llm.complete_json(messages)
            raw = data.get("scores") or {}
            return ScoreBreakdown(
                pronunciation=float(raw.get("pronunciation", 70)),
                grammar=float(raw.get("grammar", 70)),
                fluency=float(raw.get("fluency", 70)),
                vocabulary=float(raw.get("vocabulary", 70)),
                coherence=float(raw.get("coherence", 70)),
                overall=float(raw.get("overall", 70)),
            )
        except Exception:
            logger.exception("LLM report scoring failed for session %s", session.session_id)
            return None

    async def _llm_feedback(
        self,
        session: ConversationSession,
        scores: ScoreBreakdown,
    ) -> tuple[str, list[str], list[ImprovementSuggestion]]:
        messages: list[ChatMessage] = [
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    _build_user_payload(session)
                    + f"\n\nComputed scores: {scores.model_dump()}"
                ),
            },
        ]
        try:
            llm = get_llm_client()
            data = await llm.complete_json(messages)
            summary = str(data.get("summary") or "")
            highlights = [str(h) for h in (data.get("highlights") or [])][:6]
            suggestions: list[ImprovementSuggestion] = []
            for item in data.get("suggestions") or []:
                if not isinstance(item, dict):
                    continue
                suggestions.append(
                    ImprovementSuggestion(
                        area=str(item.get("area", "general")),
                        current_score=float(item.get("current_score", 70)),
                        target_score=float(item.get("target_score", 85)),
                        suggestion=str(item.get("suggestion", "")),
                        priority=int(item.get("priority", 3)),
                    )
                )
            return summary, highlights, suggestions
        except Exception:
            logger.exception("LLM report feedback failed for session %s", session.session_id)
            return "", [], []


report_service = ReportService()
