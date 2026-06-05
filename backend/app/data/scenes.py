from app.prompts.scene_prompts import build_coach_system_prompt
from app.schemas.enums import SceneId
from app.schemas.scene import Scene

PRESET_SCENES: list[Scene] = [
    Scene(
        id=SceneId.INTERVIEW,
        name="Job Interview",
        name_zh="面试",
        description="Practice answering common interview questions confidently and professionally.",
        system_prompt=build_coach_system_prompt(SceneId.INTERVIEW),
        icon="💼",
    ),
    Scene(
        id=SceneId.ORDERING,
        name="Restaurant Ordering",
        name_zh="点餐",
        description="Order food and drinks at a restaurant, handle preferences and special requests.",
        system_prompt=build_coach_system_prompt(SceneId.ORDERING),
        icon="🍽️",
    ),
    Scene(
        id=SceneId.MEETING,
        name="Team Meeting",
        name_zh="会议",
        description="Participate in a team meeting — share updates, give opinions, and ask questions.",
        system_prompt=build_coach_system_prompt(SceneId.MEETING),
        icon="📋",
    ),
]


def get_scene_by_id(scene_id: SceneId) -> Scene | None:
    return next((s for s in PRESET_SCENES if s.id == scene_id), None)
