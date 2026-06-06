"use client";

import DailyGoalRing from "@/components/dashboard/DailyGoalRing";
import SkillsRadarChart from "@/components/dashboard/SkillsRadarChart";
import type { SkillScores } from "@/lib/dashboardMockData";

type Props = {
  displayName: string;
  dailyMinutes: number;
  dailyGoalMinutes: number;
  streakDays: number;
  skills: SkillScores;
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function SidebarStats({
  displayName,
  dailyMinutes,
  dailyGoalMinutes,
  streakDays,
  skills,
  collapsed,
  onToggle,
}: Props) {
  return (
    <aside className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-indigo-100/30 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">AI 口语成长看板</p>
          </div>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label={collapsed ? "展开看板" : "收起看板"}
          >
            <svg className={`h-5 w-5 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <div className={`space-y-6 ${collapsed ? "hidden lg:block" : "block"}`}>
        <DailyGoalRing minutes={dailyMinutes} goalMinutes={dailyGoalMinutes} streakDays={streakDays} />
        <div className="border-t border-slate-100 pt-5">
          <SkillsRadarChart skills={skills} />
        </div>
      </div>
    </aside>
  );
}
