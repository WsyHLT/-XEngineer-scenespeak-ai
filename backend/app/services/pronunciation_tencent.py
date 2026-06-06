"""腾讯云智聆口语评测 SOE — 准确度 / 流畅度 / 完整度。"""

import asyncio
import base64
import json
import logging
import os
import uuid

from app.core.config import settings
from app.schemas.enums import CorrectionSeverity, CorrectionType
from app.schemas.message import Correction
from app.schemas.pronunciation import PronunciationAssessment, WordPronunciationFeedback
from app.services.audio_utils import ensure_wav_file, read_pcm16_from_wav
from app.services.pronunciation_utils import extract_tencent_phoneme

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.tencent_secret_id and settings.tencent_secret_key)


def _severity(score: float) -> CorrectionSeverity:
    if score >= 80:
        return CorrectionSeverity.MINOR
    if score >= 60:
        return CorrectionSeverity.MODERATE
    return CorrectionSeverity.MAJOR


def _assess_sync(wav_path: str, reference_text: str) -> PronunciationAssessment:
    if not _is_configured():
        raise ValueError(
            "腾讯云口语评测未配置。请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY"
        )

    try:
        from tencentcloud.common import credential
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import (
            TencentCloudSDKException,
        )
        from tencentcloud.soe.v20180724 import models, soe_client
    except ImportError as exc:
        raise ImportError("请安装: pip install tencentcloud-sdk-python-soe") from exc

    pcm = read_pcm16_from_wav(wav_path)
    audio_b64 = base64.b64encode(pcm).decode("ascii")

    cred = credential.Credential(settings.tencent_secret_id, settings.tencent_secret_key)
    client = soe_client.SoeClient(cred, settings.tencent_region)

    req = models.TransmitOralProcessWithInitRequest()
    params = {
        "SeqId": 1,
        "IsEnd": 1,
        "VoiceFileType": 1,
        "VoiceEncodeType": 1,
        "UserVoiceData": audio_b64,
        "SessionId": str(uuid.uuid4()),
        "RefText": reference_text,
        "WorkMode": 0,
        "EvalMode": 1,
        "ServerType": 0,
        "ScoreCoeff": 1.0,
    }
    if settings.tencent_soe_appid:
        params["SoeAppId"] = settings.tencent_soe_appid

    req.from_json_string(json.dumps(params))

    try:
        resp = client.TransmitOralProcessWithInit(req)
        payload = json.loads(resp.to_json_string())
    except TencentCloudSDKException as exc:
        raise RuntimeError(f"腾讯云 SOE 失败: {exc}") from exc

    accuracy = float(payload.get("PronAccuracy", 0))
    fluency = float(payload.get("PronFluency", 0))
    completeness = float(payload.get("PronCompletion", 0))
    overall = float(payload.get("SuggestedScore", payload.get("PronScore", 0)))

    words: list[WordPronunciationFeedback] = []
    corrections: list[Correction] = []

    for w in payload.get("Words") or []:
        word = w.get("Word") or w.get("ReferenceWord") or ""
        if not word:
            continue
        acc = float(w.get("PronAccuracy", w.get("MatchTag", 0)) or 0)
        if acc <= 1:
            acc *= 100
        err = w.get("MatchTag") or w.get("ErrorType")
        words.append(
            WordPronunciationFeedback(
                word=str(word),
                accuracy_score=acc,
                phoneme=extract_tencent_phoneme(w),
                error_type=str(err) if err not in (None, 0, "0") else None,
            )
        )
        if acc < 85 and word:
            phone = extract_tencent_phoneme(w) or ""
            corrections.append(
                Correction(
                    original=str(word),
                    corrected=str(word),
                    explanation=f"发音准确度 {acc:.0f}，音素 /{phone}/ 需改进" if phone else f"「{word}」发音需改进",
                    correction_type=CorrectionType.PRONUNCIATION,
                    severity=_severity(acc),
                )
            )

    return PronunciationAssessment(
        accuracy=accuracy,
        fluency=fluency * 100 if fluency <= 1 else fluency,
        completeness=completeness * 100 if completeness <= 1 else completeness,
        overall=overall,
        words=words,
        corrections=corrections[:5],
    )


async def assess_pronunciation(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment:
    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    try:
        return await asyncio.to_thread(_assess_sync, wav_path, reference_text.strip())
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
        logger.exception("腾讯云发音评测失败（已跳过）")
        return None
