"use client";

import type { PronunciationAssessment, WordPronunciationFeedback } from "@/types/api";

type Props = {
  assessment: PronunciationAssessment;
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

function chipStyle(score: number): string {
  if (score >= 80) return "border-amber-200 bg-amber-50/90";
  if (score >= 60) return "border-orange-200 bg-orange-50/90";
  return "border-red-200 bg-red-50/90";
}

function WordChip({ word, phoneme, accuracy_score }: WordPronunciationFeedback) {
  return (
    <div
      className={`flex min-w-[4.5rem] flex-col items-center rounded-lg border px-2.5 py-2 ${chipStyle(accuracy_score)}`}
    >
      {phoneme ? (
        <span className="font-mono text-[11px] leading-tight text-sky-700">/{phoneme}/</span>
      ) : (
        <span className="text-[10px] text-slate-400">—</span>
      )}
      <span className="mt-0.5 text-sm font-semibold text-slate-800">{word}</span>
      <span className={`mt-0.5 text-[10px] font-medium ${scoreColor(accuracy_score)}`}>
        {Math.round(accuracy_score)}
      </span>
    </div>
  );
}

export default function PronunciationBubble({ assessment }: Props) {
  const items = [
    { label: "准确度", value: assessment.accuracy },
    { label: "流畅度", value: assessment.fluency },
    { label: "完整度", value: assessment.completeness },
    { label: "综合", value: assessment.overall },
  ];

  const weakWords = assessment.words
    .filter((w) => w.accuracy_score < 85)
    .sort((a, b) => a.accuracy_score - b.accuracy_score)
    .slice(0, 6);

  return (
    <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        发音评测
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-white/70 px-1 py-2">
            <div className={`text-lg font-bold ${scoreColor(value)}`}>{Math.round(value)}</div>
            <div className="text-xs text-sky-700/80">{label}</div>
          </div>
        ))}
      </div>

      {weakWords.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-sky-800/90">待改进 · 对照音标放慢重读</p>
          <div className="flex flex-wrap gap-2">
            {weakWords.map((w) => (
              <WordChip key={w.word} {...w} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-emerald-700">各词发音良好，继续保持</p>
      )}
    </div>
  );
}
