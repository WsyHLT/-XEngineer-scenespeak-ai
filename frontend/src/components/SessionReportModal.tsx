"use client";

import ScoreChart from "@/components/ScoreChart";
import type { SessionReport } from "@/types/api";

type Props = {
  report: SessionReport;
  onClose: () => void;
  onRestart: () => void;
};

export default function SessionReportModal({ report, onClose, onRestart }: Props) {
  const minutes = Math.floor(report.duration_seconds / 60);
  const seconds = report.duration_seconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">课后总结</h2>
            <p className="text-sm text-slate-500">
              {report.scene_name} · {report.total_turns} 轮 · {minutes}分{seconds}秒
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8 p-6">
          <ScoreChart scores={report.scores} />

          <section>
            <h3 className="mb-2 font-semibold text-slate-800">综合反馈</h3>
            <p className="rounded-xl bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
              {report.summary}
            </p>
            {report.highlights.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {report.highlights.map((h) => (
                  <li
                    key={h}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    ✓ {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {report.suggestions.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-slate-800">提升建议</h3>
              <div className="space-y-3">
                {report.suggestions.map((s) => (
                  <div
                    key={s.area}
                    className="rounded-xl border border-slate-100 p-4 text-sm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium capitalize text-slate-700">{s.area}</span>
                      <span className="text-xs text-slate-400">
                        {s.current_score} → {s.target_score} 分
                      </span>
                    </div>
                    <p className="text-slate-600">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.corrections.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-slate-800">
                纠错清单 ({report.corrections.length})
              </h3>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {report.corrections.map((c) => (
                  <div
                    key={c.message_id}
                    className="rounded-lg bg-slate-50 px-4 py-3 text-sm"
                  >
                    <p className="text-xs text-slate-400">第 {c.turn_index} 轮</p>
                    <p className="line-through text-slate-500">{c.user_utterance}</p>
                    <p className="font-medium text-indigo-700">{c.correction.corrected}</p>
                    <p className="mt-1 text-xs text-slate-500">{c.correction.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            再练一次
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-6 py-3 font-medium text-slate-600 hover:bg-slate-50"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
