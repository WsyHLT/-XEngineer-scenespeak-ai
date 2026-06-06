"""从腾讯云 / Azure SOE 词级结果中提取音标/音素串。"""


def extract_tencent_phoneme(word_payload: dict) -> str | None:
    parts: list[str] = []
    for info in word_payload.get("PhoneInfos") or []:
        if not isinstance(info, dict):
            continue
        phone = str(info.get("Phone") or info.get("ReferencePhone") or "").strip()
        if phone:
            parts.append(phone)
    if parts:
        return " ".join(parts)

    for key in ("ReferencePhone", "Phone", "WordPhone"):
        val = word_payload.get(key)
        if val:
            text = str(val).strip()
            if text:
                return text
    return None


def extract_azure_phoneme(word_payload: dict) -> str | None:
    parts: list[str] = []
    for info in word_payload.get("Phonemes") or []:
        if not isinstance(info, dict):
            continue
        phone = str(info.get("Phoneme") or "").strip()
        if phone:
            parts.append(phone)
    return " ".join(parts) if parts else None
