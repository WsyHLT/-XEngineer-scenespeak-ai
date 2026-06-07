"use client";

import { useCallback, useEffect, useState } from "react";

import AmbientWaveform from "@/components/cockpit/AmbientWaveform";
import GlassRadar from "@/components/cockpit/GlassRadar";
import ProficiencyDailyQuest from "@/components/cockpit/ProficiencyDailyQuest";
import { MOCK_SKILLS } from "@/lib/cockpitMockData";
import {
  computeProficiencyQuest,
  computeRecentSkillAverage,
  computeStreakDays,
} from "@/lib/historyAnalytics";
import { subscribeHistoryChanged } from "@/lib/historyEvents";
import { hasRealHistory } from "@/lib/practiceHistoryStore";
import type { SkillScores } from "@/types/history";

type Props = {
  onBlindBox: () => void;
  loading?: boolean;
};

export default function CockpitConsole({ onBlindBox, loading }: Props) {
  const [skills, setSkills] = useState<SkillScores>(() =>
    hasRealHistory() ? computeRecentSkillAverage() : MOCK_SKILLS,
  );
  const [streak, setStreak] = useState(() => computeStreakDays());
  const [quest, setQuest] = useState(() => computeProficiencyQuest());

  const refreshStats = useCallback(() => {
    setSkills(hasRealHistory() ? computeRecentSkillAverage() : MOCK_SKILLS);
    setStreak(computeStreakDays());
    setQuest(computeProficiencyQuest());
  }, []);

  useEffect(() => {
    refreshStats();
    return subscribeHistoryChanged(() => refreshStats());
  }, [refreshStats]);

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] p-5 shadow-depth-md backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 animate-glow-pulse rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 animate-glow-pulse rounded-full bg-blue-600/15 blur-2xl" />

        <div className="relative mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-400/60">
            AI Core
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-slate-50">口语时空舱</h2>
          <p className="mt-1 text-xs text-slate-500">实时语音 · 智能纠错 · 进化追踪</p>
        </div>

        <AmbientWaveform />

        <button
          type="button"
          disabled={loading}
          onClick={onBlindBox}
          className="relative mt-6 w-full overflow-hidden rounded-2xl transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]" />
          <span className="relative flex flex-col items-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 shadow-depth-md">
            <span className="text-base font-bold text-slate-50">🎲 盲盒 · 自由闲聊</span>
            <span className="mt-0.5 text-xs text-indigo-200/60">一键随机进入零压力对话</span>
          </span>
        </button>
      </div>

      <GlassRadar skills={skills} />

      <div className="glass-panel rounded-2xl p-5 text-center">
        <p className="font-data text-2xl font-bold text-slate-50">🔥 {streak}</p>
        <p className="mt-0.5 text-xs text-slate-500">连续打卡天数</p>
      </div>

      <ProficiencyDailyQuest data={quest} />
    </aside>
  );
}
