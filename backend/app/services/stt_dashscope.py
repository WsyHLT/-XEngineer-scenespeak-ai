"""阿里云百炼 DashScope Paraformer 语音识别（国内可用）。"""

import asyncio
import logging
import os
import wave

import dashscope
from dashscope.audio.asr import Recognition, RecognitionCallback, RecognitionResult

from app.core.config import settings
from app.services.audio_utils import ensure_wav_file, wav_peak_rms

logger = logging.getLogger(__name__)


def merge_transcript_parts(sentences: list[str], pending: str) -> str:
    """合并已断句片段与尚未收到 sentence_end 的最后一段。"""
    parts = [s.strip() for s in sentences if s.strip()]
    tail = pending.strip()
    if tail and (not parts or parts[-1] != tail):
        parts.append(tail)
    return " ".join(parts).strip()


class _TranscriptCollector(RecognitionCallback):
    """收集 Paraformer 流式结果 — 多句合并，而非只取最后一条。"""

    def __init__(self) -> None:
        self.sentences: list[str] = []
        self._current: str = ""
        self._events: list[str] = []
        self.error: str | None = None

    def on_open(self) -> None:
        pass

    def on_close(self) -> None:
        pass

    def on_complete(self) -> None:
        pass

    def on_error(self, result: RecognitionResult) -> None:
        self.error = getattr(result, "message", None) or str(result)

    def on_event(self, result: RecognitionResult) -> None:
        sentence = result.get_sentence()
        if not isinstance(sentence, dict):
            return
        text = str(sentence.get("text") or "").strip()
        if not text:
            return

        self._events.append(text)
        self._current = text

        if RecognitionResult.is_sentence_end(sentence):
            self._commit_current()

    def _commit_current(self) -> None:
        text = self._current.strip()
        if text and (not self.sentences or self.sentences[-1] != text):
            self.sentences.append(text)
        self._current = ""

    def best_text(self) -> str:
        merged = merge_transcript_parts(self.sentences, self._current)
        if merged:
            return merged
        # 兜底：若未触发 sentence_end，取最后一次事件（多为整段累积文本）
        if self._events:
            return self._events[-1].strip()
        return ""


def _wav_duration_seconds(wav_path: str) -> float:
    try:
        with wave.open(wav_path, "rb") as wf:
            rate = wf.getframerate() or 16000
            return wf.getnframes() / rate
    except Exception:
        return 0.0


def _is_transient_network_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return any(
        k in msg
        for k in (
            "name resolution",
            "cannot connect to host",
            "connection reset",
            "timed out",
            "timeout",
            "temporary failure",
        )
    )


def _transcribe_sync(wav_path: str) -> str:
    api_key = settings.stt_api_key
    if not api_key:
        raise ValueError(
            "STT API Key 未配置。请在 backend/.env 设置 STT_API_KEY（阿里云百炼 API Key）"
        )

    dashscope.api_key = api_key

    language_hints = settings.stt_language_hints or ["en"]
    duration_s = _wav_duration_seconds(wav_path)
    logger.info(
        "DashScope STT model=%s language_hints=%s duration=%.1fs",
        settings.stt_dashscope_model,
        language_hints,
        duration_s,
    )

    collector = _TranscriptCollector()
    recognition_kwargs: dict = {
        "model": settings.stt_dashscope_model,
        "format": "wav",
        "sample_rate": 16000,
        "language_hints": language_hints,
        "callback": collector,
    }
    if settings.stt_max_sentence_silence > 0:
        recognition_kwargs["max_sentence_silence"] = settings.stt_max_sentence_silence

    recognition = Recognition(**recognition_kwargs)

    try:
        recognition.start()
        with open(wav_path, "rb") as audio_file:
            while chunk := audio_file.read(12800):
                recognition.send_audio_frame(chunk)
        recognition.stop()
    except Exception as exc:
        logger.exception("DashScope streaming STT failed")
        if _is_transient_network_error(exc):
            raise ValueError(
                "无法连接阿里云 DashScope（DNS/网络异常）。请检查网络或配置 STT_HTTP_PROXY 后重启后端"
            ) from exc
        raise RuntimeError(f"DashScope STT 失败: {exc}") from exc

    if collector.error:
        msg = collector.error
        if "InvalidApiKey" in msg or "invalid" in msg.lower():
            raise ValueError(
                "DashScope API Key 无效。请到 https://bailian.console.aliyun.com/ 获取北京地域 Key"
            )
        raise RuntimeError(f"DashScope STT 失败: {msg}")

    text = collector.best_text()
    logger.info(
        "DashScope STT result sentences=%d events=%d chars=%d",
        len(collector.sentences),
        len(collector._events),
        len(text),
    )
    if not text:
        raise ValueError(
            "未识别到语音内容。请按住按钮至少 1 秒，清晰说英文后再松开"
        )
    return text


async def transcribe_dashscope(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    peak, rms = await asyncio.to_thread(wav_peak_rms, wav_path)
    logger.info("STT input peak=%.4f rms=%.4f size=%d", peak, rms, len(audio_bytes))
    if peak < 0.005 and rms < 0.001:
        raise ValueError(
            "录音几乎是静音（Chrome 可能未授权麦克风或选错输入设备）。"
            "请点击地址栏锁图标 → 麦克风 → 选择正确设备后重试"
        )
    last_error: Exception | None = None
    try:
        for attempt in range(3):
            try:
                return await asyncio.to_thread(_transcribe_sync, wav_path)
            except ValueError:
                raise
            except Exception as exc:
                last_error = exc
                if attempt < 2 and _is_transient_network_error(exc):
                    logger.warning("DashScope STT 网络重试 %s/2: %s", attempt + 1, exc)
                    await asyncio.sleep(0.8 * (attempt + 1))
                    continue
                raise
        if last_error:
            raise last_error
        raise RuntimeError("DashScope STT 失败")
    finally:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
