"use client";

import { useState } from "react";

import { IconInfo } from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";
import type { ChatInsight } from "@/types/chat";
import { SQUIRCLE_LG } from "@/lib/designSystem";

type Props = {
  insight: ChatInsight;
  defaultOpen?: boolean;
};

function SparkIcon() {
  return (
    <IconShell size="sm" className="pointer-events-none border-0 bg-indigo-500/12 shadow-none">
      <IconInfo className="h-3 w-3" />
    </IconShell>
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
    <div className={`mt-2 overflow-hidden ${SQUIRCLE_LG} bg-indigo-950/30 shadow-depth backdrop-blur-md`}>
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
              <span className="mb-1.5 inline-block rounded-[10px] bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400/80">
                Grammar Fix
              </span>
              <p className="mt-1 leading-relaxed">
                <span className="text-amber-300/80 line-through decoration-amber-500/60">
                  {insight.grammarFix.original}
                </span>
                <span className="mx-2 text-slate-600">→</span>
                <span className="font-medium text-amber-200/90">
                  {insight.grammarFix.corrected}
                </span>
              </p>
            </div>
          )}

          {insight.betterAlternative && (
            <div>
              <span className="mb-1.5 inline-block rounded-[10px] bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-300/80">
                Better Alternative
              </span>
              <p className="mt-1 font-medium leading-relaxed text-indigo-300/75">
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
