"use client";

import type { ScoreBreakdown } from "@/types/api";

const DIMENSIONS: { key: keyof ScoreBreakdown; label: string; color: string }[] = [
  { key: "pronunciation", label: "发音", color: "bg-violet-500" },
  { key: "grammar", label: "语法", color: "bg-indigo-500" },
  { key: "fluency", label: "流利度", color: "bg-cyan-500" },
  { key: "vocabulary", label: "词汇", color: "bg-emerald-500" },
  { key: "coherence", label: "连贯性", color: "bg-purple-500" },
];

type Props = {
  scores: ScoreBreakdown;
};

export default function ScoreChart({ scores }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center gap-2">
        <span className="text-5xl font-bold text-indigo-600">{scores.overall}</span>
        <span className="mb-2 text-lg text-slate-400">/ 100</span>
      </div>
      <p className="text-center text-sm text-slate-500">综合得分</p>

      <div className="mt-6 space-y-3">
        {DIMENSIONS.map(({ key, label, color }) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <span className="tabular-nums text-slate-600">{scores[key]} 分</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${scores[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
