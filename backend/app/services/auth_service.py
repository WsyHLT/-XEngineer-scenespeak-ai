"""站点访问令牌 — 纯标准库 HMAC，无额外依赖。"""

import base64
import hashlib
import hmac
import json
import secrets
import time


def _sign_payload(payload_b64: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()


def create_access_token(secret: str, ttl_hours: int = 168) -> tuple[str, int]:
    """签发 Bearer Token，默认 7 天有效。"""
    expires_in = ttl_hours * 3600
    exp = int(time.time()) + expires_in
    payload = {"exp": exp, "v": 1}
    payload_b64 = (
        base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode())
        .decode()
        .rstrip("=")
    )
    sig = _sign_payload(payload_b64, secret)
    return f"{payload_b64}.{sig}", expires_in


def verify_access_token(token: str, secret: str) -> bool:
    if not token or not secret:
        return False
    try:
        payload_b64, sig = token.rsplit(".", 1)
        if not hmac.compare_digest(_sign_payload(payload_b64, secret), sig):
            return False
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return int(payload.get("exp", 0)) > time.time()
    except Exception:
        return False


def verify_password(candidate: str, expected: str) -> bool:
    if not expected:
        return False
    return secrets.compare_digest(candidate, expected)
