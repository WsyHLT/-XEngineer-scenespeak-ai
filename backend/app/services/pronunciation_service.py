"""发音评测门面 — 腾讯云 SOE 新版 / Azure Speech。"""

import logging

from app.core.config import settings
from app.schemas.pronunciation import PronunciationAssessment

logger = logging.getLogger(__name__)


async def assess_pronunciation(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment:
    provider = settings.pronunciation_provider.lower().strip()

    if provider == "tencent":
        from app.services.pronunciation_tencent_v2 import assess_pronunciation as _tencent

        return await _tencent(audio_bytes, reference_text, filename)

    if provider == "azure":
        from app.services.pronunciation_azure import assess_pronunciation as _azure

        return await _azure(audio_bytes, reference_text, filename)

    raise ValueError(
        f"未知 PRONUNCIATION_PROVIDER: {provider}，可选 tencent / azure"
    )


async def assess_pronunciation_optional(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment | None:
    provider = settings.pronunciation_provider.lower().strip()

    if provider == "tencent":
        from app.services.pronunciation_tencent_v2 import assess_pronunciation_optional as _opt

        return await _opt(audio_bytes, reference_text, filename)

    if provider == "azure":
        from app.services.pronunciation_azure import assess_pronunciation_optional as _opt

        return await _opt(audio_bytes, reference_text, filename)

    return None
