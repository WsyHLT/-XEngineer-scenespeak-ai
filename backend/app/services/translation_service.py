"""英文 → 简体中文翻译（LLM）。"""

from app.services.llm_client import get_llm_client

_SYSTEM = (
    "你是专业英中翻译。将用户的英文翻译成自然、流畅的简体中文。"
    "只输出译文，不要引号、不要解释、不要重复英文。"
)


async def translate_en_to_zh(text: str) -> str:
    trimmed = text.strip()
    if not trimmed:
        return ""
    client = get_llm_client()
    return await client.complete_text(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": trimmed},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
