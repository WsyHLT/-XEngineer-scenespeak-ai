import json
from typing import Annotated, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    llm_model: str = "gpt-4o-mini"

    # ── 路线 B · 听：百炼 ASR（默认 Paraformer，Qwen-ASR 可选）──
    stt_provider: str = "dashscope"
    stt_model: str = "qwen3-asr-flash-realtime"
    stt_dashscope_model: str = "paraformer-realtime-v2"
    stt_api_key: str = ""
    stt_base_url: str = ""
    stt_http_proxy: str = ""
    llm_http_proxy: str = ""
    stt_language_hints: Annotated[list[str], NoDecode] = ["en"]
    stt_max_sentence_silence: int = 1500  # ms，长段自我介绍中停顿稍长再断句
    bailian_asr_language: str = "en"

    # SenseVoice (FunASR 本地/ModelScope) — 可选
    sensevoice_model: str = "iic/SenseVoiceSmall"
    sensevoice_device: str = "cpu"
    sensevoice_language: str = "en"

    # ── 路线 B · 评测：腾讯云智聆 SOE ──
    pronunciation_provider: str = "tencent"
    tencent_app_id: str = ""
    tencent_secret_id: str = ""
    tencent_secret_key: str = ""
    tencent_region: str = "ap-guangzhou"
    tencent_soe_engine: str = "16k_en"
    tencent_soe_host: str = "soe.cloud.tencent.com"
    tencent_score_coeff: float = 1.0
    tencent_soe_appid: str = ""  # 基础版遗留，新版不用

    # Azure Speech — 发音评测备选
    azure_speech_key: str = ""
    azure_speech_region: str = ""
    azure_pronunciation_language: str = "en-US"

    # ── 路线 B · 说：火山引擎 TTS ──
    tts_provider: str = "volcano"
    volcano_app_id: str = ""
    volcano_access_token: str = ""
    volcano_cluster: str = "volcano_tts"
    volcano_voice_type: str = "BV700_streaming"
    volcano_audio_encoding: str = "mp3"
    volcano_speed_ratio: float = 1.0
    tts_timeout_seconds: float = 15.0
    tts_max_retries: int = 3
    tts_max_chars: int = 400
    tts_model: str = "tts-1"
    tts_voice: str = "alloy"

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    max_session_turns: int = 30

    # Coach dialogue
    coach_temperature: float = 0.75
    coach_max_tokens: int = 256

    # Correction (can use a faster/cheaper model)
    correction_model: str = "gpt-4o-mini"
    correction_temperature: float = 0.2
    correction_max_tokens: int = 512

    llm_timeout_seconds: float = 60.0
    llm_enable_thinking: bool = False

    @field_validator("stt_language_hints", mode="before")
    @classmethod
    def parse_stt_language_hints(cls, value: Any) -> list[str]:
        if value is None or value == "":
            return ["en"]
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [part.strip() for part in stripped.split(",") if part.strip()]
        return ["en"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        """支持 .env 中逗号分隔或 JSON 数组两种写法。"""
        if value is None or value == "":
            return ["http://localhost:3000"]
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value


settings = Settings()
