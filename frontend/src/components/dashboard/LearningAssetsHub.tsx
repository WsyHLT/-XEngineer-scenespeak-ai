"use client";

import { useCallback, useState } from "react";

import type { PracticeHistoryItem } from "@/lib/dashboardMockData";

function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (score >= 60) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-red-50 text-red-700 ring-red-100";
}

type HistoryProps = {
  items: PracticeHistoryItem[];
  onViewReport?: (id: string) => void;
};

function HistoryNotebook({ items, onViewReport }: HistoryProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">场景</th>
              <th className="px-4 py-3">评分</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{row.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.scene}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${scoreBadgeClass(row.score)}`}
                  >
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onViewReport?.(row.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                  >
                    查看纠错报告
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ExpressionProps = {
  text: string;
  hint: string;
};

function DailyExpressionCard({ text, hint }: ExpressionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          Daily Expression
        </span>
        <span className="text-xs text-slate-500">今日推荐核心句型</span>
      </div>
      <p className="text-base font-medium leading-relaxed text-slate-800">&ldquo;{text}&rdquo;</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-100 transition-colors hover:bg-indigo-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {copied ? "已复制" : "一键复制"}
      </button>
    </div>
  );
}

type Props = {
  history: PracticeHistoryItem[];
  expression: ExpressionProps;
  onViewReport?: (id: string) => void;
};

export default function LearningAssetsHub({ history, expression, onViewReport }: Props) {
  return (
    <section className="mt-10 border-t border-slate-200/80 pt-10">
      <h2 className="mb-1 text-xl font-bold text-slate-900">学习资产库</h2>
      <p className="mb-6 text-sm text-slate-500">历史报告、错题本与每日句型积累</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">历史报告与错题本</h3>
          <HistoryNotebook items={history} onViewReport={onViewReport} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">今日推荐</h3>
          <DailyExpressionCard {...expression} />
        </div>
      </div>
    </section>
  );
}
