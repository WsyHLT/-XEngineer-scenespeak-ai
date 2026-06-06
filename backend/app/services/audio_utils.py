"""浏览器录音 → PCM16 / WAV，供百炼 ASR 与腾讯云 SOE 使用。"""

import io
import logging
import os
import subprocess
import tempfile
import wave
from pathlib import Path

logger = logging.getLogger(__name__)


def _convert_with_ffmpeg(
    audio_bytes: bytes,
    filename: str,
    sample_rate: int,
) -> str:
    suffix = Path(filename).suffix or ".webm"
    in_path = out_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as inf:
            inf.write(audio_bytes)
            in_path = inf.name

        out_fd, out_path = tempfile.mkstemp(suffix=".wav", prefix="stt_")
        os.close(out_fd)

        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                in_path,
                "-ar",
                str(sample_rate),
                "-ac",
                "1",
                "-f",
                "wav",
                out_path,
            ],
            capture_output=True,
            check=False,
        )
        if proc.returncode != 0:
            stderr = proc.stderr.decode(errors="replace")[:300]
            raise RuntimeError(f"ffmpeg 转换失败: {stderr}")
        return out_path
    finally:
        if in_path and os.path.exists(in_path):
            os.unlink(in_path)


def _convert_with_av(audio_bytes: bytes, sample_rate: int) -> str:
    import av  # noqa: PLC0415

    buf_in = io.BytesIO(audio_bytes)
    container = av.open(buf_in)
    if not container.streams.audio:
        raise ValueError("录音中未检测到音频轨道")

    resampler = av.audio.resampler.AudioResampler(
        format="s16",
        layout="mono",
        rate=sample_rate,
    )
    pcm_chunks: list[bytes] = []
    for frame in container.decode(audio=0):
        for resampled in resampler.resample(frame):
            pcm_chunks.append(resampled.to_ndarray().flatten().tobytes())
    for resampled in resampler.resample(None):
        pcm_chunks.append(resampled.to_ndarray().flatten().tobytes())
    if not pcm_chunks:
        raise ValueError("录音为空或无法解码，请重试")

    fd, path = tempfile.mkstemp(suffix=".wav", prefix="stt_")
    os.close(fd)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"".join(pcm_chunks))
    return path


def wav_peak_rms(wav_path: str) -> tuple[float, float]:
    """返回 WAV 峰值与 RMS，用于诊断「有文件但 ASR 为空」的静音录音。"""
    import struct

    with wave.open(wav_path, "rb") as wf:
        frames = wf.readframes(wf.getnframes())
        if wf.getsampwidth() != 2 or not frames:
            return 0.0, 0.0
        count = len(frames) // 2
        samples = struct.unpack(f"<{count}h", frames)
        peak = max(abs(s) for s in samples) / 32768.0
        rms = (sum(s * s for s in samples) / count) ** 0.5 / 32768.0
        return peak, rms


def ensure_wav_file(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    sample_rate: int = 16000,
) -> str:
    if len(audio_bytes) < 100:
        raise ValueError("录音太短，请按住按钮多说几句")
    try:
        return _convert_with_ffmpeg(audio_bytes, filename, sample_rate)
    except FileNotFoundError:
        logger.info("未找到 ffmpeg，尝试 PyAV 解码")
    except RuntimeError as exc:
        logger.warning("ffmpeg 失败，尝试 PyAV: %s", exc)
    try:
        return _convert_with_av(audio_bytes, sample_rate)
    except ImportError as exc:
        raise ValueError(
            "无法转换录音。请安装 ffmpeg（sudo apt install ffmpeg）或 pip install av"
        ) from exc


def read_pcm16_from_wav(wav_path: str) -> bytes:
    with wave.open(wav_path, "rb") as wf:
        if wf.getsampwidth() != 2:
            raise ValueError("WAV 采样宽度不支持")
        return wf.readframes(wf.getnframes())
