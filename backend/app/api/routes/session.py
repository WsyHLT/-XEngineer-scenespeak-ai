from fastapi import APIRouter, HTTPException

from app.data.scenes import get_scene_by_id
from app.schemas.enums import SessionStatus
from app.schemas.session import SessionStartRequest, SessionStartResponse
from app.services.session_store import session_store

router = APIRouter(prefix="/api/session", tags=["session"])


def _build_ws_url(session_id: str) -> str:
    from app.core.config import settings

    return f"ws://{settings.host}:{settings.port}/api/chat/ws?session_id={session_id}"


@router.post("/start", response_model=SessionStartResponse)
async def start_session(body: SessionStartRequest) -> SessionStartResponse:
    scene = get_scene_by_id(body.scene_id)
    if scene is None:
        raise HTTPException(status_code=400, detail="Invalid scene_id")

    session = session_store.create(body.scene_id)

    return SessionStartResponse(
        session_id=session.session_id,
        scene=scene,
        status=SessionStatus.ACTIVE,
        started_at=session.started_at,
        websocket_url=_build_ws_url(session.session_id),
    )
