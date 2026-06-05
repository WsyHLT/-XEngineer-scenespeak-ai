"use client";

import type { Correction } from "@/types/api";

const TYPE_LABEL: Record<Correction["correction_type"], string> = {
  grammar: "语法",
  expression: "表达",
  pronunciation: "发音",
  vocabulary: "词汇",
};

const SEVERITY_STYLE: Record<Correction["severity"], string> = {
  minor: "bg-amber-50 border-amber-200 text-amber-800",
  moderate: "bg-orange-50 border-orange-200 text-orange-800",
  major: "bg-red-50 border-red-200 text-red-800",
};

type Props = {
  correction: Correction;
};

export default function CorrectionBubble({ correction }: Props) {
  return (
    <div
      className={`mt-2 rounded-xl border px-4 py-3 text-sm ${SEVERITY_STYLE[correction.severity]}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-semibold">
          {TYPE_LABEL[correction.correction_type]}提示
        </span>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs capitalize">
          {correction.severity}
        </span>
      </div>
      <div className="space-y-1.5 pl-6">
        <p>
          <span className="opacity-70">原句：</span>
          <span className="line-through">{correction.original}</span>
        </p>
        <p>
          <span className="opacity-70">建议：</span>
          <span className="font-medium">{correction.corrected}</span>
        </p>
        <p className="text-xs opacity-80">{correction.explanation}</p>
      </div>
    </div>
  );
}
