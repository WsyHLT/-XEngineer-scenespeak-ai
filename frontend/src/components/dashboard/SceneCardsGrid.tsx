"use client";

import type { Scene, SceneId } from "@/types/api";

const SCENE_GRADIENTS: Record<SceneId, string> = {
  interview: "from-indigo-500 via-violet-500 to-purple-600",
  ordering: "from-orange-400 via-amber-500 to-yellow-500",
  meeting: "from-cyan-500 via-blue-500 to-indigo-600",
  casual_chat: "from-sky-400 via-blue-500 to-indigo-500",
  travel: "from-teal-400 via-cyan-500 to-blue-500",
  ielts: "from-indigo-500 via-violet-500 to-purple-600",
};

const SCENE_ACCENT: Record<SceneId, string> = {
  interview: "shadow-indigo-200/60 hover:shadow-indigo-300/80",
  ordering: "shadow-orange-200/60 hover:shadow-orange-300/80",
  meeting: "shadow-cyan-200/60 hover:shadow-cyan-300/80",
  casual_chat: "shadow-sky-200/60 hover:shadow-sky-300/80",
  travel: "shadow-teal-200/60 hover:shadow-teal-300/80",
  ielts: "shadow-violet-200/60 hover:shadow-violet-300/80",
};

type Props = {
  scenes: Scene[];
  loading?: boolean;
  onSelect: (scene: Scene) => void;
};

export default function SceneCardsGrid({ scenes, loading, onSelect }: Props) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">选择练习场景</h2>
        <p className="mt-1 text-sm text-slate-600">
          在真实语境中练口语 — 实时对话、智能纠错、课后量化反馈
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene)}
              className={`group relative flex flex-col items-start overflow-hidden rounded-2xl bg-white p-5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${SCENE_ACCENT[scene.id]}`}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${SCENE_GRADIENTS[scene.id]}`} />
              <div className="mb-3 flex w-full items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  {scene.icon ?? "🎯"}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">{scene.name_zh}</h3>
                  <p className="text-xs text-slate-500">{scene.name}</p>
                </div>
              </div>
              <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                {scene.description}
              </p>
              <span
                className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r px-3.5 py-1.5 text-sm font-semibold text-white ${SCENE_GRADIENTS[scene.id]}`}
              >
                开始练习
                <span aria-hidden>→</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export { SCENE_GRADIENTS, SCENE_ACCENT };
