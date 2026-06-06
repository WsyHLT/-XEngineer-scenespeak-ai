import logging
from io import BytesIO

import httpx
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


def _openai_stt_client() -> tuple[AsyncOpenAI, str]:
    api_key = settings.stt_api_key or settings.openai_api_key
    base_url = settings.stt_base_url or settings.openai_base_url
    if not api_key:
        raise ValueError("STT API Key 未配置，请在 .env 中设置 STT_API_KEY")

    client_kwargs: dict = {"api_key": api_key, "base_url": base_url, "timeout": 60.0}
    if settings.stt_http_proxy:
        client_kwargs["http_client"] = httpx.AsyncClient(
            proxy=settings.stt_http_proxy,
            timeout=60.0,
        )

    return AsyncOpenAI(**client_kwargs), settings.stt_model


async def _transcribe_openai_compatible(
    audio_bytes: bytes,
    filename: str = "audio.webm",
) -> str:
    client, model = _openai_stt_client()
    buffer = BytesIO(audio_bytes)
    buffer.name = filename

    result = await client.audio.transcriptions.create(
        model=model,
        file=buffer,
        language="en",
    )

    text = (result.text if hasattr(result, "text") else str(result)).strip()
    if not text:
        raise ValueError("未识别到有效英文语音，请靠近麦克风重试")
    return text


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    级联架构 · ASR 层
    - bailian: 百炼 Qwen-ASR Realtime（路线 B 默认）
    - sensevoice: FunASR SenseVoice
    - dashscope: 阿里云 Paraformer 云端
    - openai/groq: OpenAI 兼容 Whisper
    """
    provider = settings.stt_provider.lower().strip()

    if provider == "bailian":
        from app.services.stt_bailian import transcribe_bailian

        return await transcribe_bailian(audio_bytes, filename)

    if provider == "sensevoice":
        try:
            from app.services.stt_sensevoice import transcribe_sensevoice

            return await transcribe_sensevoice(audio_bytes, filename)
        except ImportError:
            logger.warning("FunASR 未安装，回退 DashScope Paraformer")
            from app.services.stt_dashscope import transcribe_dashscope

            return await transcribe_dashscope(audio_bytes, filename)

    if provider == "dashscope":
        from app.services.stt_dashscope import transcribe_dashscope

        return await transcribe_dashscope(audio_bytes, filename)

    if provider in ("openai", "groq", "whisper"):
        return await _transcribe_openai_compatible(audio_bytes, filename)

    raise ValueError(
        f"未知 STT_PROVIDER: {provider}，可选 bailian / sensevoice / dashscope / openai"
    )
