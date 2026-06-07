from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.services.auth_service import verify_access_token


class AccessAuthMiddleware(BaseHTTPMiddleware):
    """SITE_ACCESS_PASSWORD 已配置时，除白名单外所有 HTTP 接口需 Bearer Token。"""

    PUBLIC_EXACT = frozenset({"/", "/favicon.ico", "/openapi.json", "/redoc"})
    PUBLIC_PREFIXES = ("/health", "/api/auth/")

    async def dispatch(self, request: Request, call_next):
        if not settings.is_auth_enabled():
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path in self.PUBLIC_EXACT or any(path.startswith(p) for p in self.PUBLIC_PREFIXES):
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "未授权访问，请先登录"})

        token = auth[7:].strip()
        if not verify_access_token(token, settings.get_auth_secret()):
            return JSONResponse(status_code=401, content={"detail": "访问令牌无效或已过期，请重新登录"})

        return await call_next(request)
