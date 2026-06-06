"use client";

import {
  ACCENT_OPTIONS,
  DIFFICULTY_OPTIONS,
  type AccentMode,
  type DifficultyLevel,
} from "@/lib/dashboardMockData";

type Props = {
  difficulty: DifficultyLevel;
  accent: AccentMode;
  onDifficultyChange: (v: DifficultyLevel) => void;
  onAccentChange: (v: AccentMode) => void;
};

export default function DashboardNavbar({
  difficulty,
  accent,
  onDifficultyChange,
  onAccentChange,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200/50">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">SceneSpeak AI</p>
            <p className="hidden text-xs text-slate-500 sm:block">AI 口语教练工作台</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <label className="hidden items-center gap-1.5 sm:flex">
            <span className="text-xs text-slate-500">难度</span>
            <select
              value={difficulty}
              onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden items-center gap-1.5 md:flex">
            <span className="text-xs text-slate-500">口音</span>
            <select
              value={accent}
              onChange={(e) => onAccentChange(e.target.value as AccentMode)}
              className="max-w-[10rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              {ACCENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* 移动端：难度/口音合并 */}
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:hidden"
            aria-label="难度"
          >
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label.split(" ")[0]}
              </option>
            ))}
          </select>

          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-semibold text-slate-600 ring-2 ring-white"
            title="用户头像"
          >
            U
          </div>
        </div>
      </div>
    </header>
  );
}
