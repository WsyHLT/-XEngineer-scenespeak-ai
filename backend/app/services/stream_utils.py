import json

from app.services.conversation_service import TurnEvent


def turn_event_to_sse(event: TurnEvent) -> str:
    """将 TurnEvent 序列化为 SSE data 行。"""
    payload = {
        "kind": event.kind,
        "session_id": event.session_id,
        "message_id": event.message_id,
    }
    if event.delta is not None:
        payload["delta"] = event.delta
    if event.message is not None:
        payload["message"] = event.message.model_dump(mode="json")
    if event.correction is not None:
        payload["correction"] = event.correction.model_dump(mode="json")

    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
