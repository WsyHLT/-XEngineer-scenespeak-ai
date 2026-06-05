"use client";

import type { Scene, SceneId } from "@/types/api";

const SCENE_GRADIENTS: Record<SceneId, string> = {
  interview: "from-indigo-500 via-violet-500 to-purple-600",
  ordering: "from-orange-400 via-amber-500 to-yellow-500",
  meeting: "from-cyan-500 via-blue-500 to-indigo-600",
};

const SCENE_ACCENT: Record<SceneId, string> = {
  interview: "shadow-indigo-200/60 hover:shadow-indigo-300/80",
  ordering: "shadow-orange-200/60 hover:shadow-orange-300/80",
  meeting: "shadow-cyan-200/60 hover:shadow-cyan-300/80",
};

type Props = {
  scenes: Scene[];
  loading?: boolean;
  onSelect: (scene: Scene) => void;
};

export default function SceneDashboard({ scenes, loading, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            AI English Coach
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            选择练习场景
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            在真实语境中练口语 — 实时对话、智能纠错、课后量化反馈
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelect(scene)}
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl bg-white p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${SCENE_ACCENT[scene.id]}`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${SCENE_GRADIENTS[scene.id]}`}
                />
                <div className="mb-4 flex w-full items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {scene.icon ?? "🎯"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900">{scene.name_zh}</h2>
                    <p className="text-sm text-slate-500">{scene.name}</p>
                  </div>
                </div>
                <p className="mb-6 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {scene.description}
                </p>
                <span
                  className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white ${SCENE_GRADIENTS[scene.id]}`}
                >
                  开始练习
                  <span aria-hidden className="text-base leading-none">→</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-slate-400">
          支持实时语音对话 · 语法纠错 · 课后报告
        </footer>
      </div>
    </div>
  );
}
