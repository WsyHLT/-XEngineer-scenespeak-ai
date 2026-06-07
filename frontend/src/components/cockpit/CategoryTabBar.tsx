"use client";

import type { SceneCategory } from "@/lib/cockpitMockData";

const WAVE_DELAYS = ["0ms", "120ms", "240ms", "360ms", "480ms"] as const;

function AudioWaveLine() {
  return (
    <svg
      viewBox="0 0 28 10"
      className="mx-auto mt-1.5 h-2.5 w-7"
      aria-hidden
    >
      {WAVE_DELAYS.map((delay, i) => (
        <rect
          key={i}
          x={2 + i * 5}
          y={2}
          width={2.5}
          height={6}
          rx={1.25}
          className="origin-center fill-indigo-300/90 animate-wave-line"
          style={{ animationDelay: delay, transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

type Tab = { id: SceneCategory; label: string };

type Props = {
  tabs: Tab[];
  active: SceneCategory;
  onChange: (id: SceneCategory) => void;
};

export default function CategoryTabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-2xl bg-white/[0.03] p-1 shadow-depth">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex flex-col items-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
              isActive
                ? "animate-tab-breathe bg-indigo-500/15 text-slate-50"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
            }`}
          >
            {tab.label}
            {isActive ? <AudioWaveLine /> : <span className="mt-1.5 h-2.5" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
