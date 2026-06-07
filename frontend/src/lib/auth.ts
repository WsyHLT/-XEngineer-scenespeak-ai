const TOKEN_STORAGE_KEY = "scenespeak-access-token";
const COOKIE_NAME = "scenespeak-token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || readCookie(COOKIE_NAME);
}

export function setAccessToken(token: string, maxAgeSeconds: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  clearAccessToken();
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

export async function fetchAuthStatus(): Promise<{ enabled: boolean; authenticated: boolean }> {
  const res = await fetch("/api/auth/status", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    return { enabled: true, authenticated: false };
  }
  return res.json() as Promise<{ enabled: boolean; authenticated: boolean }>;
}

export async function loginWithPassword(password: string): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let message = "登录失败，请稍后重试";
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  setAccessToken(data.access_token, data.expires_in);
}
