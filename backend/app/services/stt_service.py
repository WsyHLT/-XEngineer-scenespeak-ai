import logging
from io import BytesIO

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


def _stt_client() -> tuple[AsyncOpenAI, str]:
    api_key = settings.stt_api_key or settings.openai_api_key
    base_url = settings.stt_base_url or settings.openai_base_url
    if not api_key:
        raise ValueError("STT API Key 未配置，请在 .env 中设置 STT_API_KEY")
    return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=60.0), settings.stt_model


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    语音转文字 — OpenAI 兼容 Whisper 接口。
    支持 Groq (whisper-large-v3)、OpenAI Whisper 等。
    DeepSeek 不支持 STT，需单独配置 STT_API_KEY / STT_BASE_URL。
    """
    client, model = _stt_client()
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
