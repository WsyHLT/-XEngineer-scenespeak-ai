from app.prompts.scene_prompts import build_coach_system_prompt
from app.schemas.enums import SceneId
from app.schemas.scene import Scene

PRESET_SCENES: list[Scene] = [
    Scene(
        id=SceneId.INTERVIEW,
        name="Job Interview",
        name_zh="职场通关",
        description="Practice answering common interview questions confidently and professionally.",
        system_prompt=build_coach_system_prompt(SceneId.INTERVIEW),
        icon="💼",
    ),
    Scene(
        id=SceneId.ORDERING,
        name="Restaurant Ordering",
        name_zh="生存口语",
        description="Order food and drinks at a restaurant, handle preferences and special requests.",
        system_prompt=build_coach_system_prompt(SceneId.ORDERING),
        icon="🍔",
    ),
    Scene(
        id=SceneId.MEETING,
        name="Global Team Meeting",
        name_zh="跨国会议",
        description="Participate in a team meeting — share updates, give opinions, and ask questions.",
        system_prompt=build_coach_system_prompt(SceneId.MEETING),
        icon="🤝",
    ),
    Scene(
        id=SceneId.CASUAL_CHAT,
        name="Casual Chat · Virtual Friend",
        name_zh="自由闲聊",
        description="Zero-pressure daily chat — movies, gossip, feelings, like talking to a friend.",
        system_prompt=build_coach_system_prompt(SceneId.CASUAL_CHAT),
        icon="💬",
    ),
    Scene(
        id=SceneId.TRAVEL,
        name="Airport Customs",
        name_zh="环球旅行",
        description="Customs, immigration, baggage and travel emergencies in English.",
        system_prompt=build_coach_system_prompt(SceneId.TRAVEL),
        icon="✈️",
    ),
    Scene(
        id=SceneId.IELTS,
        name="IELTS / TOEFL Speaking",
        name_zh="学术冲刺",
        description="Official-style speaking exam practice with timed, high-intensity prompts.",
        system_prompt=build_coach_system_prompt(SceneId.IELTS),
        icon="🎓",
    ),
]


def get_scene_by_id(scene_id: SceneId) -> Scene | None:
    return next((s for s in PRESET_SCENES if s.id == scene_id), None)
