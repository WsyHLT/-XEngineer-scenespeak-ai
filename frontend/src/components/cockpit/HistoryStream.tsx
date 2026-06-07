"use client";

import type { SceneId } from "@/types/api";
import type { HistoryRecord } from "@/types/history";
import { formatDuration, formatHistoryDisplayDate } from "@/lib/historyFormat";
import { HISTORY_MAX_ENTRIES, HISTORY_WARN_THRESHOLD } from "@/types/history";
import { SCENARIO_MATRIX } from "@/lib/cockpitMockData";

function scoreTone(score: number): string {
  if (score >= 80) return "text-indigo-200 bg-indigo-500/12";
  if (score >= 60) return "text-violet-200/90 bg-violet-500/10";
  return "text-slate-400 bg-white/[0.06]";
}

const SCENE_FILTER_OPTIONS: { id: SceneId | "all"; label: string }[] = [
  { id: "all", label: "全部场景" },
  ...SCENARIO_MATRIX.map((s) => ({ id: s.backendSceneId, label: s.name_zh })),
];

type Props = {
  records: HistoryRecord[];
  sceneFilter: SceneId | "all";
  onSceneFilterChange: (id: SceneId | "all") => void;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  showLimitWarning?: boolean;
};

export default function HistoryStream({
  records,
  sceneFilter,
  onSceneFilterChange,
  onView,
  onDelete,
  onClearAll,
  showLimitWarning,
}: Props) {
  return (
    <div id="history-stream" className="mt-10 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-50">时光回溯</h3>
          <p className="mt-0.5 text-xs text-slate-500">错题本与练习报告</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sceneFilter}
            onChange={(e) => onSceneFilterChange(e.target.value as SceneId | "all")}
            className="rounded-[10px] bg-indigo-950/25 px-2.5 py-1.5 text-xs text-slate-400 outline-none backdrop-blur-sm"
            aria-label="按场景筛选历史"
          >
            {SCENE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {records.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-[10px] px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              清空全部
            </button>
          )}
        </div>
      </div>

      {showLimitWarning && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200/80">
          历史记录即将达到上限（{HISTORY_WARN_THRESHOLD}/{HISTORY_MAX_ENTRIES}），请及时清理较早的记录。
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2 cyber-scrollbar">
        {records.length === 0 ? (
          <p className="text-sm text-slate-500">完成一次练习后，记录会出现在这里。</p>
        ) : (
          records.map((r) => (
            <article
              key={r.id}
              className="glass-panel group relative min-w-[240px] shrink-0 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] hover:shadow-depth-md"
            >
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="absolute right-2 top-2 rounded-md p-1 text-slate-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                  aria-label="删除此记录"
                  title="删除"
                >
                  🗑
                </button>
              )}
              <div className="mb-3 flex items-center justify-between pr-6">
                <span className="text-xs text-slate-500">
                  {formatHistoryDisplayDate(r.practicedAt)}
                </span>
                <span
                  className={`rounded-[10px] px-2 py-0.5 font-data text-xs font-semibold ${scoreTone(r.score)}`}
                >
                  {r.score}
                </span>
              </div>
              <p className="font-semibold text-slate-50">{r.scene}</p>

              <div className="mt-2 flex flex-wrap gap-2 font-data text-[10px] text-slate-500">
                <span>⏱ {formatDuration(r.durationSeconds)}</span>
                <span>💬 {r.totalTurns} 轮</span>
                {r.grammarErrorCount > 0 && (
                  <span className="text-rose-300/70">{r.grammarErrorCount} 语法</span>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {r.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onView?.(r.id)}
                className="mt-4 w-full text-left text-xs font-medium text-indigo-400/80 transition-colors hover:text-indigo-300"
              >
                查看纠错报告 →
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export { SCENE_FILTER_OPTIONS };
