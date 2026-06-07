"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import AudioChat, { type ExitOptions } from "@/components/AudioChat";
import SceneDashboard from "@/components/SceneDashboard";
import { fetchScenes, startSession } from "@/lib/api";
import type { Scene } from "@/types/api";

type View = "dashboard" | "chat";

function ChatLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-slate-400">
      正在加载通话舱…
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollToHistory, setScrollToHistory] = useState(false);

  useEffect(() => {
    fetchScenes()
      .then(setScenes)
      .catch(() => setError("无法加载场景，请确认后端已启动 (localhost:8000)"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectScene = useCallback(async (scene: Scene) => {
    setError(null);
    setLoading(true);
    try {
      const res = await startSession(scene.id);
      setSessionId(res.session_id);
      setActiveScene(res.scene);
      setStartedAt(new Date(res.started_at));
      setView("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建会话失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExit = useCallback((options?: ExitOptions) => {
    setView("dashboard");
    setSessionId(null);
    setActiveScene(null);
    setStartedAt(null);
    if (options?.scrollToHistory) {
      setScrollToHistory(true);
    }
  }, []);

  if (view === "chat" && sessionId && activeScene && startedAt) {
    return (
      <Suspense fallback={<ChatLoader />}>
        <AudioChat
          sessionId={sessionId}
          scene={activeScene}
          startedAt={startedAt}
          onExit={handleExit}
        />
      </Suspense>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-[14px] bg-rose-950/40 px-4 py-2 text-sm text-rose-200/90 shadow-depth backdrop-blur-md">
          {error}
        </div>
      )}
      <SceneDashboard
        backendScenes={scenes}
        loading={loading}
        onSelect={handleSelectScene}
        onSelectError={setError}
        scrollToHistory={scrollToHistory}
        onScrolledToHistory={() => setScrollToHistory(false)}
      />
    </>
  );
}
