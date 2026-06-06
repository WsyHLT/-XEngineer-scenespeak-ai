"""火山引擎豆包语音 · HTTP TTS。"""

import asyncio
import base64
import logging
import uuid
from urllib.parse import urlparse

import httpx

from app.core.config import settings
from app.services.net_utils import resolve_ipv4

logger = logging.getLogger(__name__)

_VOLCANO_TTS_URL = "https://openspeech.bytedance.com/api/v1/tts"
_TTS_HOST = "openspeech.bytedance.com"

_client: httpx.AsyncClient | None = None


def _is_configured() -> bool:
    return bool(settings.volcano_app_id and settings.volcano_access_token)


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        timeout = httpx.Timeout(
            settings.tts_timeout_seconds,
            connect=min(10.0, settings.tts_timeout_seconds),
        )
        _client = httpx.AsyncClient(timeout=timeout)
    return _client


def _build_payload(text: str) -> dict:
    return {
        "app": {
            "appid": settings.volcano_app_id,
            "token": settings.volcano_access_token,
            "cluster": settings.volcano_cluster,
        },
        "user": {"uid": "scenespeak"},
        "audio": {
            "voice_type": settings.volcano_voice_type,
            "encoding": settings.volcano_audio_encoding,
            "speed_ratio": settings.volcano_speed_ratio,
            "volume_ratio": 1.0,
            "pitch_ratio": 1.0,
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text.strip(),
            "text_type": "plain",
            "operation": "query",
        },
    }


def _is_transient_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError)):
        return True
    return any(
        k in msg
        for k in (
            "timeout",
            "timed out",
            "name resolution",
            "connection reset",
            "502",
            "503",
            "504",
            "temporarily unavailable",
        )
    )


async def _post_tts(text: str) -> bytes:
    headers = {
        "Authorization": f"Bearer;{settings.volcano_access_token}",
        "Content-Type": "application/json",
    }
    payload = _build_payload(text)

    url = _VOLCANO_TTS_URL
    request_kwargs: dict = {}
    try:
        ip = await asyncio.to_thread(resolve_ipv4, _TTS_HOST)
        if ip != _TTS_HOST:
            parsed = urlparse(_VOLCANO_TTS_URL)
            url = f"{parsed.scheme}://{ip}{parsed.path}"
            request_kwargs["headers"] = {**headers, "Host": _TTS_HOST}
    except OSError as exc:
        logger.warning("火山 TTS DNS 回退失败，直连域名: %s", exc)

    client = _get_client()
    resp = await client.post(url, headers=request_kwargs.get("headers", headers), json=payload)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 3000:
        raise RuntimeError(f"火山 TTS 失败: {data.get('message', data)}")

    audio_b64 = data.get("data")
    if not audio_b64:
        raise RuntimeError("火山 TTS 返回空音频")
    return base64.b64decode(audio_b64)


async def synthesize_volcano(text: str) -> bytes:
    trimmed = text.strip()
    if not trimmed:
        raise ValueError("合成文本不能为空")
    if not _is_configured():
        raise ValueError(
            "火山 TTS 未配置。请设置 VOLCANO_APP_ID 和 VOLCANO_ACCESS_TOKEN"
        )

    last_error: Exception | None = None
    for attempt in range(settings.tts_max_retries):
        try:
            return await _post_tts(trimmed)
        except Exception as exc:
            last_error = exc
            if attempt < settings.tts_max_retries - 1 and _is_transient_error(exc):
                wait = 0.4 * (attempt + 1)
                logger.warning("火山 TTS 重试 %s/%s: %s", attempt + 1, settings.tts_max_retries, exc)
                await asyncio.sleep(wait)
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("火山 TTS 失败")
