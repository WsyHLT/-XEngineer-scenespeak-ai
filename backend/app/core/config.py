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
    stt_model: str = "whisper-1"
    stt_api_key: str = ""
    stt_base_url: str = ""
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
