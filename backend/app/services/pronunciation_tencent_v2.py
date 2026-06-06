"""腾讯云智聆口语评测（新版）— WebSocket API。"""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import random
import re
import time
import uuid
from urllib.parse import quote, urlencode, urlparse

import websockets

from app.core.config import settings
from app.schemas.pronunciation import PronunciationAssessment, WordPronunciationFeedback
from app.services.audio_utils import ensure_wav_file, read_pcm16_from_wav
from app.services.net_utils import resolve_ipv4
from app.services.pronunciation_utils import extract_tencent_phoneme

logger = logging.getLogger(__name__)

_SOE_WSS_HOST = "soe.cloud.tencent.com/soe/api"


def _is_configured() -> bool:
    return bool(
        settings.tencent_app_id
        and settings.tencent_secret_id
        and settings.tencent_secret_key
    )


def _pick_eval_mode(reference_text: str) -> int:
    word_count = len(reference_text.strip().split())
    if word_count <= 1:
        return 0
    if word_count <= 30:
        return 1
    return 2


def _build_wss_url(reference_text: str, voice_id: str) -> str:
    now = int(time.time())
    params = {
        "secretid": settings.tencent_secret_id,
        "timestamp": str(now),
        "expired": str(now + 86400),
        "nonce": str(random.randint(1, 9999999999)),
        "server_engine_type": settings.tencent_soe_engine,
        "voice_id": voice_id,
        "voice_format": "0",
        "ref_text": reference_text.strip(),
        "eval_mode": str(_pick_eval_mode(reference_text)),
        "score_coeff": str(settings.tencent_score_coeff),
        "rec_mode": "1",
        "text_mode": "0",
    }

    query_for_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    sign_plain = f"{_SOE_WSS_HOST}/{settings.tencent_app_id}?{query_for_sign}"
    digest = hmac.new(
        settings.tencent_secret_key.encode("utf-8"),
        sign_plain.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    params["signature"] = base64.b64encode(digest).decode("ascii")

    query = urlencode(params, quote_via=quote)
    return f"wss://{_SOE_WSS_HOST}/{settings.tencent_app_id}?{query}"


def _parse_result_payload(raw: object) -> dict:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str) or not raw.strip():
        return {}

    text = raw.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    parsed: dict = {}
    for key in ("SuggestedScore", "PronAccuracy", "PronFluency", "PronCompletion"):
        match = re.search(rf"{key}:([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)", text)
        if match:
            parsed[key] = float(match.group(1))
    return parsed


def _normalize_score(value: float, *, ratio_scale: bool = False) -> float:
    if ratio_scale and 0 <= value <= 1:
        return value * 100
    return value


def _build_assessment(payload: dict) -> PronunciationAssessment:
    accuracy = float(payload.get("PronAccuracy", 0))
    fluency = _normalize_score(float(payload.get("PronFluency", 0)), ratio_scale=True)
    completeness = _normalize_score(float(payload.get("PronCompletion", 0)), ratio_scale=True)
    overall = float(payload.get("SuggestedScore", payload.get("PronScore", 0)))
    if overall <= 0 and accuracy > 0:
        overall = accuracy * completeness / 100 * (2 - completeness / 100)

    words: list[WordPronunciationFeedback] = []

    for w in payload.get("Words") or []:
        word = w.get("Word") or w.get("ReferenceWord") or ""
        if not word or word in {"*", ""}:
            continue
        acc = float(w.get("PronAccuracy", 0) or 0)
        if acc < 0:
            continue
        match_tag = w.get("MatchTag")
        phoneme = extract_tencent_phoneme(w)
        words.append(
            WordPronunciationFeedback(
                word=str(word),
                accuracy_score=acc,
                phoneme=phoneme,
                error_type=str(match_tag) if match_tag not in (None, 0, "0") else None,
            )
        )

    return PronunciationAssessment(
        accuracy=max(0.0, accuracy),
        fluency=max(0.0, fluency),
        completeness=max(0.0, completeness),
        overall=max(0.0, overall),
        words=words,
        corrections=[],
    )


def _is_dns_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "name resolution" in msg or "gaierror" in msg or "errno -3" in msg


def _open_soe_websocket(url: str):
    parsed = urlparse(url)
    host = parsed.hostname or settings.tencent_soe_host
    connect_url = url
    connect_kwargs: dict = {"open_timeout": 20, "close_timeout": 5}

    try:
        ip = resolve_ipv4(host)
        if ip != host:
            connect_url = url.replace(f"://{host}", f"://{ip}", 1)
            connect_kwargs["server_hostname"] = host
    except OSError:
        logger.warning("DNS 回退失败，仍尝试直连域名 %s", host)

    return websockets.connect(connect_url, **connect_kwargs)


async def _assess_pcm(pcm: bytes, reference_text: str) -> PronunciationAssessment:
    if not _is_configured():
        raise ValueError(
            "腾讯云口语评测（新版）未配置。"
            "请设置 TENCENT_APP_ID、TENCENT_SECRET_ID、TENCENT_SECRET_KEY"
        )

    ref = reference_text.strip()
    if not ref:
        raise ValueError("reference_text 不能为空")

    voice_id = str(uuid.uuid4())
    url = _build_wss_url(ref, voice_id)
    latest_payload: dict = {}
    last_error: Exception | None = None

    for attempt in range(3):
        try:
            async with _open_soe_websocket(url) as ws:
                handshake = json.loads(await asyncio.wait_for(ws.recv(), timeout=20))
                if handshake.get("code") != 0:
                    raise RuntimeError(
                        f"腾讯云 SOE 握手失败: {handshake.get('message', handshake)}"
                    )

                await ws.send(pcm)
                await ws.send(json.dumps({"type": "end"}))

                while True:
                    message = json.loads(await asyncio.wait_for(ws.recv(), timeout=60))
                    code = message.get("code", 0)
                    if code != 0:
                        raise RuntimeError(
                            f"腾讯云 SOE 失败: {message.get('message', message)}"
                        )

                    if "result" in message:
                        parsed = _parse_result_payload(message["result"])
                        if parsed:
                            latest_payload = parsed

                    if message.get("final") == 1:
                        break

            if not latest_payload:
                raise RuntimeError("腾讯云 SOE 未返回评测结果，请检查录音与参考文本")
            return _build_assessment(latest_payload)
        except Exception as exc:
            last_error = exc
            if attempt < 2 and _is_dns_error(exc):
                logger.warning("SOE DNS/连接重试 %s/2: %s", attempt + 1, exc)
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("腾讯云 SOE 失败")


async def assess_pronunciation(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment:
    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    try:
        pcm = await asyncio.to_thread(read_pcm16_from_wav, wav_path)
        return await _assess_pcm(pcm, reference_text.strip())
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass


async def assess_pronunciation_optional(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment | None:
    if not _is_configured():
        return None
    try:
        return await assess_pronunciation(audio_bytes, reference_text, filename)
    except Exception:
        logger.exception("腾讯云发音评测（新版）失败（已跳过）")
        return None
