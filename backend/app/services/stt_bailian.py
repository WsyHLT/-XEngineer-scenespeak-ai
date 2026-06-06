"""阿里百炼 · Qwen-ASR Realtime（DashScope WebSocket）。"""

import asyncio
import base64
import json
import logging
import os
import threading
import time

import dashscope
from dashscope.audio.qwen_omni import (
    MultiModality,
    OmniRealtimeCallback,
    OmniRealtimeConversation,
)

try:
    from dashscope.audio.qwen_omni import TranscriptionParams
except ImportError:
    from dashscope.audio.qwen_omni.omni_realtime import TranscriptionParams

from app.core.config import settings
from app.services.audio_utils import ensure_wav_file, read_pcm16_from_wav

logger = logging.getLogger(__name__)

_BAILIAN_WS = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"


class _QwenAsrCallback(OmniRealtimeCallback):
    def __init__(self) -> None:
        self.final_text = ""
        self.error: str | None = None
        self._done = threading.Event()

    def on_event(self, message: str) -> None:
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            return
        event_type = data.get("type", "")
        if event_type == "conversation.item.input_audio_transcription.completed":
            self.final_text = str(data.get("transcript", "")).strip()
        elif event_type == "conversation.item.input_audio_transcription.text":
            partial = str(data.get("text", "")) + str(data.get("stash", ""))
            if partial.strip():
                self.final_text = partial.strip()
        elif event_type == "session.finished":
            self._done.set()
        elif event_type == "error":
            self.error = data.get("message") or str(data)
            self._done.set()

    def on_close(self, close_status_code, close_msg) -> None:
        self._done.set()

    def wait(self, timeout: float = 30.0) -> None:
        self._done.wait(timeout=timeout)


_BAILIAN_ASR_MODELS = (
    "qwen3-asr-flash-realtime",
    "qwen3-asr-flash-realtime-2025-10-27",
    "qwen3-asr-flash-realtime-2026-02-10",
)


def _transcribe_sync(wav_path: str) -> str:
    api_key = settings.stt_api_key or settings.openai_api_key
    if not api_key:
        raise ValueError("百炼 API Key 未配置，请设置 STT_API_KEY")

    dashscope.api_key = api_key
    models_to_try = [settings.stt_model]
    for name in _BAILIAN_ASR_MODELS:
        if name not in models_to_try:
            models_to_try.append(name)

    last_error: Exception | None = None
    for model_name in models_to_try:
        try:
            return _transcribe_with_model(wav_path, api_key, model_name)
        except RuntimeError as exc:
            last_error = exc
            if "model not found" in str(exc).lower():
                logger.warning("Qwen-ASR 模型 %s 不可用，尝试下一个", model_name)
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("Qwen-ASR 失败")


def _transcribe_with_model(wav_path: str, api_key: str, model_name: str) -> str:
    callback = _QwenAsrCallback()
    conversation = OmniRealtimeConversation(
        model=model_name,
        url=_BAILIAN_WS,
        callback=callback,
        api_key=api_key,
    )

    conversation.connect()
    try:
        conversation.update_session(
            output_modalities=[MultiModality.TEXT],
            enable_turn_detection=False,
            enable_input_audio_transcription=True,
            transcription_params=TranscriptionParams(
                language=settings.bailian_asr_language,
                sample_rate=16000,
                input_audio_format="pcm",
            ),
        )
        time.sleep(0.3)

        pcm = read_pcm16_from_wav(wav_path)
        chunk_size = 3200
        for i in range(0, len(pcm), chunk_size):
            chunk = pcm[i : i + chunk_size]
            conversation.append_audio(base64.b64encode(chunk).decode("ascii"))
            time.sleep(0.02)

        conversation.commit()
        conversation.end_session(timeout=25)
        callback.wait(timeout=30.0)
    finally:
        conversation.close()

    if callback.error:
        raise RuntimeError(f"Qwen-ASR 失败: {callback.error}")

    text = callback.final_text.strip()
    if not text:
        raise ValueError("未识别到语音内容，请按住按钮至少 1 秒清晰说英文")
    return text


async def transcribe_bailian(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    try:
        return await asyncio.to_thread(_transcribe_sync, wav_path)
    except Exception as exc:
        logger.warning("Qwen-ASR 失败，尝试 Paraformer 回退: %s", exc)
        from app.services.stt_dashscope import transcribe_dashscope

        return await transcribe_dashscope(audio_bytes, filename)
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
