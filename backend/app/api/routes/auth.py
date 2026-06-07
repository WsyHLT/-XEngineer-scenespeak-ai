from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.auth_service import (
    create_access_token,
    verify_access_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthStatusResponse(BaseModel):
    enabled: bool
    authenticated: bool = False


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(
    authorization: str | None = Header(default=None),
) -> AuthStatusResponse:
    if not settings.is_auth_enabled():
        return AuthStatusResponse(enabled=False, authenticated=True)

    token = _extract_bearer(authorization)
    ok = bool(token and verify_access_token(token, settings.get_auth_secret()))
    return AuthStatusResponse(enabled=True, authenticated=ok)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    if not settings.is_auth_enabled():
        token, expires_in = create_access_token(
            settings.get_auth_secret() or "dev-open",
            settings.auth_token_ttl_hours,
        )
        return LoginResponse(access_token=token, expires_in=expires_in)

    if not verify_password(body.password, settings.site_access_password):
        raise HTTPException(status_code=401, detail="访问密码错误")

    token, expires_in = create_access_token(
        settings.get_auth_secret(),
        settings.auth_token_ttl_hours,
    )
    return LoginResponse(access_token=token, expires_in=expires_in)


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[7:].strip() or None
