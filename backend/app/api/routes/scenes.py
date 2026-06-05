from fastapi import APIRouter, HTTPException

from app.data.scenes import PRESET_SCENES, get_scene_by_id
from app.schemas.enums import SceneId
from app.schemas.scene import Scene, SceneListResponse

router = APIRouter(prefix="/api/scenes", tags=["scenes"])


@router.get("", response_model=SceneListResponse)
async def list_scenes() -> SceneListResponse:
    return SceneListResponse(scenes=PRESET_SCENES)


@router.get("/{scene_id}", response_model=Scene)
async def get_scene(scene_id: SceneId) -> Scene:
    scene = get_scene_by_id(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene
