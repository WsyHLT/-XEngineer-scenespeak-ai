"use client";

import type { HistoryRecord } from "@/lib/cockpitMockData";

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30";
  if (score >= 60) return "text-amber-400 bg-amber-500/10 ring-amber-500/30";
  return "text-rose-400 bg-rose-500/10 ring-rose-500/30";
}

type Props = {
  records: HistoryRecord[];
  onView?: (id: string) => void;
};

export default function HistoryStream({ records, onView }: Props) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">时光回溯</h3>
          <p className="text-xs text-slate-500">错题本与练习报告</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {records.map((r) => (
          <article
            key={r.id}
            className="glass-panel min-w-[220px] shrink-0 rounded-xl p-4 transition-colors hover:border-indigo-500/30 hover:bg-white/[0.06]"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{r.date}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${scoreTone(r.score)}`}
              >
                {r.score}
              </span>
            </div>
            <p className="font-semibold text-slate-200">{r.scene}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 ring-1 ring-rose-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onView?.(r.id)}
              className="mt-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              查看纠错报告 →
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
