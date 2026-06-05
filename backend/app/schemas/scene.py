from pydantic import BaseModel, Field

from app.schemas.enums import SceneId


class Scene(BaseModel):
    """练习场景 — 决定 AI 角色与对话背景。"""

    id: SceneId = Field(..., description="场景唯一标识")
    name: str = Field(..., description="场景英文名称")
    name_zh: str = Field(..., description="场景中文名称")
    description: str = Field(..., description="场景简介，供前端展示")
    system_prompt: str = Field(
        ...,
        description="注入 LLM 的系统提示词，定义角色、语气与对话目标",
    )
    icon: str | None = Field(default=None, description="前端图标标识或 emoji")


class SceneListResponse(BaseModel):
    scenes: list[Scene]
