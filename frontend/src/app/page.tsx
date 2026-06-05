"use client";

import { useCallback, useEffect, useState } from "react";

import AudioChat from "@/components/AudioChat";
import SceneDashboard from "@/components/SceneDashboard";
import { fetchScenes, startSession } from "@/lib/api";
import type { Scene } from "@/types/api";

type View = "dashboard" | "chat";

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleExit = useCallback(() => {
    setView("dashboard");
    setSessionId(null);
    setActiveScene(null);
    setStartedAt(null);
  }, []);

  if (view === "chat" && sessionId && activeScene && startedAt) {
    return (
      <AudioChat
        sessionId={sessionId}
        scene={activeScene}
        startedAt={startedAt}
        onExit={handleExit}
      />
    );
  }

  return (
    <>
      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 shadow-lg ring-1 ring-red-200">
          {error}
        </div>
      )}
      <SceneDashboard
        scenes={scenes}
        loading={loading}
        onSelect={handleSelectScene}
      />
    </>
  );
}
