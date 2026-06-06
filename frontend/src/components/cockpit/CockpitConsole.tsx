"use client";

import AmbientWaveform from "@/components/cockpit/AmbientWaveform";
import GlassRadar from "@/components/cockpit/GlassRadar";
import { MOCK_SKILLS } from "@/lib/cockpitMockData";

type Props = {
  onBlindBox: () => void;
  loading?: boolean;
};

export default function CockpitConsole({ onBlindBox, loading }: Props) {
  return (
    <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 animate-glow-pulse rounded-full bg-violet-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 animate-glow-pulse rounded-full bg-blue-600/25 blur-2xl" />

        <div className="relative mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400/80">
            AI Core
          </p>
          <h2 className="text-xl font-bold text-white text-glow">口语时空舱</h2>
          <p className="mt-1 text-xs text-slate-500">实时语音 · 智能纠错 · 进化追踪</p>
        </div>

        <AmbientWaveform />

        <button
          type="button"
          disabled={loading}
          onClick={onBlindBox}
          className="relative mt-5 w-full overflow-hidden rounded-2xl p-[1px] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]" />
          <span className="relative flex flex-col items-center rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 px-6 py-4 shadow-neon-lg">
            <span className="text-lg font-bold text-white">🎲 盲盒 · 自由闲聊</span>
            <span className="mt-0.5 text-xs text-indigo-100/80">一键随机进入零压力对话</span>
          </span>
        </button>
      </div>

      <GlassRadar skills={MOCK_SKILLS} />

      <div className="glass-panel rounded-2xl p-4 text-center">
        <p className="text-2xl font-bold tabular-nums text-white">🔥 5</p>
        <p className="text-xs text-slate-500">连续打卡天数</p>
      </div>
    </aside>
  );
}
