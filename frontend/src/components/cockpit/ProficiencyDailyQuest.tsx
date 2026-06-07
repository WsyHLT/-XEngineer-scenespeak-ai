"use client";

import { useMemo, useState } from "react";

import { IconCheck, IconCopy } from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";
import Squircle from "@/components/ui/Squircle";
import type { ProficiencyQuestData } from "@/lib/historyAnalytics";
import { FONT_DATA, SQUIRCLE_LG } from "@/lib/designSystem";

const CARD_SHELL =
  "group relative w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-md " +
  "shadow-[0_4px_12px_rgba(0,0,0,0.5),0_1px_3px_rgba(255,255,255,0.05)]";

function formatXp(value: number): string {
  return value.toLocaleString("en-US");
}

type Props = {
  data: ProficiencyQuestData;
};

export default function ProficiencyDailyQuest({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const { level, daily, stats } = data;

  const xpPercent = useMemo(
    () => Math.min(100, Math.round((level.currentXp / level.targetXp) * 100)),
    [level.currentXp, level.targetXp],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(daily.phrase);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className={CARD_SHELL}>
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />

      <header className="relative mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-400/55">
          Proficiency Track
        </p>
        <h3 className="mt-0.5 text-sm font-bold text-white">口语段位 · 每日特训</h3>
        {stats.sessionsLast7Days > 0 && (
          <p className="mt-1 font-data text-[10px] text-slate-500">
            近 7 天 · {stats.sessionsLast7Days} 次 · {stats.totalMinutesLast7Days} 分钟
          </p>
        )}
      </header>

      <div className="relative flex items-start gap-3.5">
        <Squircle
          size="lg"
          className={`flex-col gap-0.5 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-indigo-600/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${SQUIRCLE_LG}`}
        >
          <span className={`${FONT_DATA} text-xl font-bold leading-none text-white`}>{level.code}</span>
          <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
            {level.label}
          </span>
        </Squircle>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-white">
              Next Level:{" "}
              <span className={`${FONT_DATA} text-indigo-200/90`}>{level.nextLevel}</span>
            </p>
            <p className={`${FONT_DATA} shrink-0 text-xs text-slate-500`}>
              {formatXp(level.currentXp)} / {formatXp(level.targetXp)} XP
            </p>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-[width] duration-500 ease-out"
              style={{ width: `${xpPercent}%` }}
              role="progressbar"
              aria-valuenow={level.currentXp}
              aria-valuemin={0}
              aria-valuemax={level.targetXp}
              aria-label={`经验值进度 ${xpPercent}%`}
            />
          </div>
          <p className={`${FONT_DATA} mt-1.5 text-[10px] text-slate-500`}>
            再积累 {formatXp(level.targetXp - level.currentXp)} XP 即可晋级
          </p>
        </div>
      </div>

      <div className="relative mt-4 border-t border-white/5 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            今日地道表达
          </p>
          <IconShell
            size="sm"
            onClick={() => void handleCopy()}
            title={copied ? "已复制" : "复制短语"}
            aria-label={copied ? "已复制到剪贴板" : "复制地道表达短语"}
            className="opacity-0 transition-all duration-300 group-hover:opacity-100 focus-visible:opacity-100"
          >
            {copied ? <IconCheck className="text-emerald-400/80" /> : <IconCopy />}
          </IconShell>
        </div>

        <blockquote className="text-[15px] font-bold leading-snug text-white">
          &ldquo;{daily.phrase}&rdquo;
        </blockquote>
        <p className="mt-1.5 text-sm text-slate-400">{daily.meaningZh}</p>
        <p className="mt-2 text-xs leading-relaxed text-emerald-500/70">{daily.tip}</p>
      </div>
    </article>
  );
}
