"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Squircle from "@/components/ui/Squircle";
import { IconMicLogo } from "@/components/ui/CyberIcons";
import { fetchAuthStatus, getAccessToken, loginWithPassword } from "@/lib/auth";
import { SQUIRCLE_LG } from "@/lib/designSystem";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchAuthStatus();
        if (cancelled) return;
        if (!status.enabled || (status.authenticated && getAccessToken())) {
          router.replace(nextPath.startsWith("/login") ? "/" : nextPath);
          return;
        }
      } catch {
        // 后端未启动时仍展示登录页
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(password);
      router.replace(nextPath.startsWith("/login") ? "/" : nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] text-slate-400">
        正在验证访问权限…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0F19] px-4">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]" />

      <div className={`relative w-full max-w-md ${SQUIRCLE_LG} bg-white/[0.03] p-8 shadow-depth-lg backdrop-blur-xl`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <Squircle
            size="lg"
            className="mb-4 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-depth"
          >
            <IconMicLogo className="h-6 w-6" />
          </Squircle>
          <h1 className="text-xl font-bold text-slate-50">SceneSpeak AI</h1>
          <p className="mt-1 text-sm text-slate-500">请输入访问密码以进入口语时空舱</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="access-password" className="mb-2 block text-xs font-medium text-slate-400">
              访问密码
            </label>
            <input
              id="access-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="部署时在服务端配置的 SITE_ACCESS_PASSWORD"
              className="w-full rounded-xl border border-white/5 bg-indigo-950/30 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-500/30 placeholder:text-slate-600 focus:ring-2"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-depth disabled:opacity-50"
          >
            {loading ? "验证中…" : "进入系统"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
          密码由站点管理员在 backend/.env 中配置。
          <br />
          未授权访问将无法调用 LLM / STT / TTS 接口。
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] text-slate-400">
          加载中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
