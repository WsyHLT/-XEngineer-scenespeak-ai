from app.prompts import build_coach_system_prompt, get_opening_line
from app.schemas.enums import MessageRole, SceneId
from app.schemas.message import Message
from app.services.llm_client import ChatMessage


class PromptManager:
    """构建 LLM 消息列表 — 隔离 prompt 工程与业务逻辑。"""

    @staticmethod
    def build_coach_messages(
        scene_id: SceneId,
        history: list[Message],
        user_text: str,
    ) -> list[ChatMessage]:
        """
        组装陪练对话 messages：
        [system] + [历史 user/assistant] + [当前 user]
        """
        messages: list[ChatMessage] = [
            {"role": "system", "content": build_coach_system_prompt(scene_id)},
        ]

        for msg in history:
            if msg.role in (MessageRole.USER, MessageRole.ASSISTANT):
                messages.append({"role": msg.role.value, "content": msg.content})

        messages.append({"role": "user", "content": user_text})
        return messages

    @staticmethod
    def build_opening_messages(scene_id: SceneId) -> list[ChatMessage]:
        """首轮：system + 预置 user 触发语，让模型以 assistant 身份开场。"""
        return [
            {"role": "system", "content": build_coach_system_prompt(scene_id)},
            {
                "role": "user",
                "content": (
                    "[Session start — the learner just joined. "
                    "Deliver your opening line in character now.]"
                ),
            },
        ]

    @staticmethod
    def get_static_opening(scene_id: SceneId) -> str:
        """无需 LLM 调用的固定开场白（低延迟冷启动）。"""
        return get_opening_line(scene_id)

    @staticmethod
    def build_correction_messages(
        user_text: str,
        scene_id: SceneId,
    ) -> list[ChatMessage]:
        from app.prompts.correction_prompt import CORRECTION_SYSTEM_PROMPT

        scene_hint = {
            SceneId.INTERVIEW: "formal job interview",
            SceneId.ORDERING: "casual restaurant ordering",
            SceneId.MEETING: "professional team meeting",
        }[scene_id]

        return [
            {"role": "system", "content": CORRECTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Scene context: {scene_hint}\n"
                    f"User utterance:\n\"{user_text}\""
                ),
            },
        ]


prompt_manager = PromptManager()
