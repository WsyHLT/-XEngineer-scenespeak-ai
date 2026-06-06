"use client";

import { useState } from "react";

import type { ChatInsight } from "@/types/chat";

type Props = {
  insight: ChatInsight;
  defaultOpen?: boolean;
};

function SparkIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

/**
 * 用户气泡下方 — 可折叠 AI 智能润色微光浮窗
 * [Grammar Fix] + [Better Alternative]
 */
export default function FloatingInsightPanel({ insight, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = insight.grammarFix || insight.betterAlternative;

  if (!hasContent) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_0_24px_rgba(99,102,241,0.08)] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
          <SparkIcon />
          AI Smart Insight
        </span>
        <span className="text-[10px] text-slate-500">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/5 px-3 py-3 text-sm">
          {insight.grammarFix && (
            <div>
              <span className="mb-1.5 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                Grammar Fix
              </span>
              <p className="mt-1 leading-relaxed">
                <span className="text-amber-300/80 line-through decoration-amber-500/60">
                  {insight.grammarFix.original}
                </span>
                <span className="mx-2 text-slate-600">→</span>
                <span className="font-medium text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                  {insight.grammarFix.corrected}
                </span>
              </p>
            </div>
          )}

          {insight.betterAlternative && (
            <div>
              <span className="mb-1.5 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
                Better Alternative
              </span>
              <p className="mt-1 font-medium leading-relaxed text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]">
                {insight.betterAlternative}
              </p>
            </div>
          )}

          {insight.explanation && (
            <p className="text-[11px] leading-relaxed text-slate-500">{insight.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
