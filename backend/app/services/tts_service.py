"""TTS 门面 — 火山引擎 / OpenAI 兼容。"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def synthesize_speech(text: str) -> tuple[bytes, str]:
    """
    返回 (audio_bytes, content_type)。
    """
    trimmed = text.strip()
    if not trimmed:
        raise ValueError("合成文本不能为空")

    if len(trimmed) > settings.tts_max_chars:
        cut = trimmed[: settings.tts_max_chars]
        if " " in cut:
            cut = cut.rsplit(" ", 1)[0]
        trimmed = cut.rstrip(".,!? ") + "..."
        logger.info("TTS 文本过长，已截断至 %d 字符", len(trimmed))

    provider = settings.tts_provider.lower().strip()

    if provider == "volcano":
        from app.services.tts_volcano import synthesize_volcano

        audio = await synthesize_volcano(trimmed)
        encoding = settings.volcano_audio_encoding
        mime = "audio/mpeg" if encoding == "mp3" else f"audio/{encoding}"
        return audio, mime

    if provider in ("openai", "deepseek"):
        from io import BytesIO

        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        resp = await client.audio.speech.create(
            model=settings.tts_model,
            voice=settings.tts_voice,
            input=text.strip(),
        )
        return resp.content, "audio/mpeg"

    raise ValueError(f"未知 TTS_PROVIDER: {provider}，可选 volcano / openai")
