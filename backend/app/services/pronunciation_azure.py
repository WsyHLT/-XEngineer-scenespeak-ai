"""Microsoft Azure Speech — Pronunciation Assessment（准确度 / 流畅度 / 完整度 / 音素级）。"""

import asyncio
import json
import logging
import os

from app.core.config import settings
from app.schemas.enums import CorrectionSeverity, CorrectionType
from app.schemas.message import Correction
from app.schemas.pronunciation import PronunciationAssessment, WordPronunciationFeedback
from app.services.audio_utils import ensure_wav_file
from app.services.pronunciation_utils import extract_azure_phoneme

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.azure_speech_key and settings.azure_speech_region)


def _severity_from_accuracy(score: float) -> CorrectionSeverity:
    if score >= 80:
        return CorrectionSeverity.MINOR
    if score >= 60:
        return CorrectionSeverity.MODERATE
    return CorrectionSeverity.MAJOR


def _assess_sync(wav_path: str, reference_text: str) -> PronunciationAssessment:
    if not _is_configured():
        raise ValueError(
            "Azure 发音评测未配置。请在 .env 设置 AZURE_SPEECH_KEY 和 AZURE_SPEECH_REGION"
        )

    try:
        import azure.cognitiveservices.speech as speechsdk
    except ImportError as exc:
        raise ImportError(
            "请安装: pip install azure-cognitiveservices-speech"
        ) from exc

    speech_config = speechsdk.SpeechConfig(
        subscription=settings.azure_speech_key,
        region=settings.azure_speech_region,
    )
    speech_config.speech_recognition_language = settings.azure_pronunciation_language

    audio_config = speechsdk.audio.AudioConfig(filename=wav_path)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
    )

    pa_config = speechsdk.PronunciationAssessmentConfig(
        reference_text=reference_text,
        grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
        granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
        enable_miscue=True,
    )
    pa_config.enable_prosody_assessment()
    pa_config.apply_to(recognizer)

    result = recognizer.recognize_once()
    if result.reason != speechsdk.ResultReason.RecognizedSpeech:
        detail = result.cancellation_details.error_details if result.cancellation_details else str(result.reason)
        raise ValueError(f"Azure 发音评测失败: {detail}")

    pa_result = speechsdk.PronunciationAssessmentResult(result)

    words: list[WordPronunciationFeedback] = []
    corrections: list[Correction] = []

    json_key = speechsdk.PropertyId.SpeechServiceResponse_JsonResult
    raw_json = result.properties.get(json_key)
    if raw_json:
        try:
            payload = json.loads(raw_json)
            nbest = payload.get("NBest") or []
            if nbest:
                for w in nbest[0].get("Words") or []:
                    acc = float(w.get("PronunciationAssessment", {}).get("AccuracyScore", 0))
                    word_text = w.get("Word", "")
                    error_type = w.get("PronunciationAssessment", {}).get("ErrorType")
                    if not word_text:
                        continue
                    words.append(
                        WordPronunciationFeedback(
                            word=word_text,
                            accuracy_score=acc,
                            phoneme=extract_azure_phoneme(w),
                            error_type=error_type if error_type != "None" else None,
                        )
                    )
                    if error_type and error_type not in ("None", "Correct") and acc < 85:
                        phonemes = w.get("Phonemes") or []
                        bad = [p for p in phonemes if p.get("PronunciationAssessment", {}).get("AccuracyScore", 100) < 70]
                        hint = ""
                        if bad:
                            hint = f"音素 /{bad[0].get('Phoneme', '')}/ 发音偏差"
                        corrections.append(
                            Correction(
                                original=word_text,
                                corrected=word_text,
                                explanation=hint or f"「{word_text}」发音需改进（{error_type}）",
                                correction_type=CorrectionType.PRONUNCIATION,
                                severity=_severity_from_accuracy(acc),
                            )
                        )
        except (json.JSONDecodeError, KeyError, TypeError):
            logger.warning("Azure 发音 JSON 解析部分失败，仍返回总分")

    prosody = getattr(pa_result, "prosody_score", None)

    return PronunciationAssessment(
        accuracy=float(pa_result.accuracy_score),
        fluency=float(pa_result.fluency_score),
        completeness=float(pa_result.completeness_score),
        overall=float(pa_result.pronunciation_score),
        prosody=float(prosody) if prosody is not None else None,
        words=words,
        corrections=corrections[:5],
    )


async def assess_pronunciation(
    audio_bytes: bytes,
    reference_text: str,
    filename: str = "audio.webm",
) -> PronunciationAssessment:
    reference_text = reference_text.strip()
    if not reference_text:
        raise ValueError("参考文本不能为空")

    wav_path = await asyncio.to_thread(ensure_wav_file, audio_bytes, filename)
    try:
        return await asyncio.to_thread(_assess_sync, wav_path, reference_text)
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
        logger.exception("Azure 发音评测失败（已跳过）")
        return None
