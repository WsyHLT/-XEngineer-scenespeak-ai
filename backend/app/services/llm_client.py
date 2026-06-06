import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, AuthenticationError

from app.core.config import settings

logger = logging.getLogger(__name__)

ChatMessage = dict[str, str]  # {"role": "...", "content": "..."}


def _extra_llm_body() -> dict[str, Any] | None:
    """百炼 DeepSeek V4 默认开思考模式，口语陪练需关闭以降低首字延迟。"""
    if settings.llm_enable_thinking:
        return None
    base = settings.openai_base_url.lower()
    model_hint = f"{settings.llm_model} {settings.correction_model}".lower()
    if "dashscope.aliyuncs.com" in base or "deepseek-v4" in model_hint or "deepseek-v3.2" in model_hint:
        return {"enable_thinking": False}
    return None


def _friendly_llm_error(exc: Exception) -> str:
    if isinstance(exc, APITimeoutError):
        return (
            "LLM 请求超时：无法连接 API 服务器。"
            "若使用 Gemini/OpenAI，请检查网络/代理；国内建议改用 DeepSeek 或通义千问。"
        )
    if isinstance(exc, APIConnectionError):
        return (
            "LLM 网络连接失败：无法访问 DeepSeek/OpenAI。"
            "请运行 curl http://localhost:8000/health/llm 自检；"
            "若不通，在 .env 配置 LLM_HTTP_PROXY 或检查网络。"
        )
    if isinstance(exc, AuthenticationError):
        return "LLM API Key 无效，请检查 backend/.env 中的 OPENAI_API_KEY。"
    return str(exc)


class LLMClient:
    """
    OpenAI 兼容客户端 — 支持 OpenAI / Groq / DeepSeek / Gemini / 通义千问等。
    通过 OPENAI_BASE_URL + OPENAI_API_KEY 切换 provider。
    """

    def __init__(self) -> None:
        timeout = httpx.Timeout(settings.llm_timeout_seconds, connect=30.0)
        client_kwargs: dict = {
            "api_key": settings.openai_api_key,
            "base_url": settings.openai_base_url,
            "timeout": timeout,
            "max_retries": 2,
        }
        if settings.llm_http_proxy:
            client_kwargs["http_client"] = httpx.AsyncClient(
                proxy=settings.llm_http_proxy,
                timeout=timeout,
            )
        self._client = AsyncOpenAI(**client_kwargs)

    async def stream_chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """流式返回 assistant 文本 delta（逐 token / chunk）。"""
        model = model or settings.llm_model
        temperature = temperature if temperature is not None else settings.coach_temperature
        max_tokens = max_tokens or settings.coach_max_tokens

        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }
            extra = _extra_llm_body()
            if extra:
                kwargs["extra_body"] = extra
            stream = await self._client.chat.completions.create(
                **kwargs,  # type: ignore[arg-type]
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            logger.exception("LLM stream failed")
            raise RuntimeError(_friendly_llm_error(exc)) from exc

    async def complete_text(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """非流式调用，返回纯文本。"""
        model = model or settings.llm_model
        temperature = temperature if temperature is not None else 0.3
        max_tokens = max_tokens or 512

        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
            }
            extra = _extra_llm_body()
            if extra:
                kwargs["extra_body"] = extra
            response = await self._client.chat.completions.create(
                **kwargs,  # type: ignore[arg-type]
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.exception("LLM complete_text failed")
            raise RuntimeError(_friendly_llm_error(exc)) from exc

    async def complete_json(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """非流式调用，期望模型返回 JSON 对象（用于纠错等结构化任务）。"""
        model = model or settings.correction_model
        temperature = temperature if temperature is not None else settings.correction_temperature
        max_tokens = max_tokens or settings.correction_max_tokens

        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
                "stream": False,
            }
            extra = _extra_llm_body()
            if extra:
                kwargs["extra_body"] = extra
            response = await self._client.chat.completions.create(
                **kwargs,  # type: ignore[arg-type]
            )
        except Exception as exc:
            logger.exception("LLM JSON call failed")
            return {"has_issue": False, "_error": _friendly_llm_error(exc)}

        raw = response.choices[0].message.content or "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("LLM returned invalid JSON: %s", raw[:200])
            return {"has_issue": False}


_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
