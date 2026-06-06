"""FunASR SenseVoice — 低延迟 ASR，对中式英语 / 中英混杂容错高。"""

import asyncio
import logging
import os
import re
import threading

from app.core.config import settings
from app.services.audio_utils import ensure_wav_file

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()


def _strip_sensevoice_tags(text: str) -> str:
    """去掉 SenseVoice 输出的 <|en|><|NEUTRAL|> 等标签。"""
    cleaned = re.sub(r"<\|[^|]+\|>", "", text)
    return re.sub(r"\s+", " ", cleaned).strip()


def _get_model():
    global _model
    with _model_lock:
        if _model is not None:
            return _model
        try:
            from funasr import AutoModel
        except ImportError as exc:
            raise ImportError(
                "FunASR 未安装。请执行: pip install funasr modelscope torch torchaudio"
            ) from exc

        logger.info(
            "加载 SenseVoice 模型 %s (device=%s)，首次运行会下载权重…",
            settings.sensevoice_model,
            settings.sensevoice_device,
        )
        _model = AutoModel(
            model=settings.sensevoice_model,
            vad_model="fsmn-vad",
            vad_kwargs={"max_single_segment_time": 30000},
            device=settings.sensevoice_device,
            disable_update=True,
        )
        return _model


def _transcribe_sync(wav_path: str) -> str:
    from funasr.utils.postprocess_utils import rich_transcription_postprocess

    model = _get_model()
    language = settings.sensevoice_language or "en"

    res = model.generate(
        input=wav_path,
        cache={},
        language=language,
        use_itn=True,
        batch_size_s=60,
        merge_vad=True,
        merge_length_s=15,
    )

    if not res or not res[0].get("text"):
        raise ValueError("未识别到语音内容，请按住按钮至少 1 秒清晰说英文")

    raw = res[0]["text"]
    text = _strip_sensevoice_tags(rich_transcription_postprocess(raw))
    if not text:
        raise ValueError("未识别到有效语音，请重试")
    return text


async def transcribe_sensevoice(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    try:
        return await asyncio.to_thread(_transcribe_sync, wav_path)
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
