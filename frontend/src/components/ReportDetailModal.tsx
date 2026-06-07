"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import Squircle from "@/components/ui/Squircle";
import TintedOverlay from "@/components/ui/TintedOverlay";
import { IconShell } from "@/components/ui/IconShell";
import { IconX } from "@/components/ui/CyberIcons";
import { getSceneTint } from "@/lib/cockpitMockData";
import { formatDuration } from "@/lib/historyFormat";
import { FONT_DATA, SQUIRCLE_LG } from "@/lib/designSystem";
import type { HistoryCorrection, ReportDetailData, SkillScores } from "@/types/history";

const SKILL_AXES: { key: keyof SkillScores; label: string; bar: string }[] = [
  { key: "pronunciation", label: "发音", bar: "from-indigo-400 to-violet-500" },
  { key: "grammar", label: "语法", bar: "from-violet-400 to-indigo-500" },
  { key: "vocabulary", label: "词汇", bar: "from-blue-400 to-indigo-500" },
  { key: "fluency", label: "流畅度", bar: "from-indigo-300 to-violet-400" },
  { key: "coherence", label: "连贯性", bar: "from-violet-300 to-indigo-400" },
];

function scoreRingTone(score: number): string {
  if (score >= 85) return "from-indigo-400 to-violet-500 text-slate-50";
  if (score >= 70) return "from-violet-500 to-indigo-600 text-slate-50";
  return "from-indigo-600/80 to-violet-700/80 text-slate-300";
}

function renderYouSaid(text: string, wrongSpans: string[]) {
  if (wrongSpans.length === 0) {
    return <span className="text-slate-400">{text}</span>;
  }
  const pattern = wrongSpans
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  return (
    <span className="text-slate-400">
      {parts.map((part, i) => {
        const isWrong = wrongSpans.some((w) => w.toLowerCase() === part.toLowerCase());
        return isWrong ? (
          <span
            key={`${part}-${i}`}
            className="font-medium text-violet-300/80 line-through decoration-violet-400/50"
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        );
      })}
    </span>
  );
}

function CorrectionCard({ item }: { item: HistoryCorrection }) {
  return (
    <li className="rounded-2xl bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        You said
      </p>
      <p className="text-sm leading-relaxed">{renderYouSaid(item.youSaid, item.wrongSpans)}</p>
      <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        AI Corrected
      </p>
      <p className="text-sm leading-relaxed text-indigo-200/80">{item.aiCorrected}</p>
      <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Better Alternative
      </p>
      <p className="text-sm leading-relaxed text-indigo-300/70">{item.betterAlternative}</p>
    </li>
  );
}

type Props = {
  report: ReportDetailData;
  onClose: () => void;
  onRestart?: () => void;
  title?: string;
};

export default function ReportDetailModal({
  report,
  onClose,
  onRestart,
  title = "课后总结",
}: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tint = getSceneTint(report.sceneName);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(onClose, 280);
  };

  if (!mounted) return null;

  return createPortal(
    <TintedOverlay visible={visible} tint={tint} onClick={handleClose} zIndex="z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#0E1424]/95 shadow-depth-lg backdrop-blur-xl transition-all duration-300 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <header className="relative flex shrink-0 items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 id="report-detail-title" className="truncate text-base font-bold text-slate-50 sm:text-lg">
              {title === "课后总结" ? title : report.sceneName}
            </h2>
            <p className="mt-0.5 font-data text-xs text-slate-500">
              {report.sceneName} · {report.displayDate} · ⏱ {formatDuration(report.durationSeconds)} · 💬{" "}
              {report.totalTurns} 轮
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[10px] bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300/70"
                >
                  {tag}
                </span>
              ))}
              {report.grammarErrorCount > 0 && (
                <span className="rounded-[10px] bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300/70">
                  {report.grammarErrorCount} 处语法
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Squircle
              size="xl"
              className={`flex-col gap-0 bg-gradient-to-br shadow-depth ${scoreRingTone(report.score)}`}
            >
              <span className={`${FONT_DATA} text-xl font-bold leading-none`}>{report.score}</span>
              <span className="text-[9px] font-medium text-slate-400">分</span>
            </Squircle>
            <IconShell size="lg" onClick={handleClose} aria-label="关闭" title="关闭">
              <IconX />
            </IconShell>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-2 pb-5 sm:px-6 sm:pb-6 cyber-scrollbar">
          {report.summary && (
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold text-slate-50">综合反馈</h3>
              <p className="rounded-2xl bg-indigo-950/35 p-4 text-sm leading-relaxed text-indigo-200/80">
                {report.summary}
              </p>
              {report.highlights.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {report.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-[10px] bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300/75"
                    >
                      ✓ {h}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="mb-8">
            <h3 className="mb-4 text-xs font-semibold text-slate-50">维度数据复盘</h3>
            <ul className="space-y-4">
              {SKILL_AXES.map(({ key, label, bar }) => {
                const value = report.skills[key];
                return (
                  <li key={key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className={`${FONT_DATA} font-semibold text-slate-50`}>{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${bar}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {report.suggestions.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 text-xs font-semibold text-slate-50">提升建议</h3>
              <div className="space-y-3">
                {report.suggestions.map((s) => (
                  <div key={s.area} className="rounded-2xl bg-white/[0.03] p-4 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium capitalize text-slate-300">{s.area}</span>
                      <span className={`${FONT_DATA} text-xs text-slate-500`}>
                        {s.current_score} → {s.target_score}
                      </span>
                    </div>
                    <p className="text-slate-400">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-4 text-xs font-semibold text-slate-50">
              核心纠错与润色 ({report.corrections.length})
            </h3>
            {report.corrections.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.02] p-4 text-sm text-slate-500">
                本场练习暂无记录到明显语法错误，继续保持！
              </p>
            ) : (
              <ul className="space-y-3">
                {report.corrections.map((item, idx) => (
                  <CorrectionCard key={idx} item={item} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-white/5 px-5 py-4 sm:px-6">
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className={`flex-1 ${SQUIRCLE_LG} bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-slate-50 shadow-depth`}
            >
              再练一次
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className={`${onRestart ? "" : "flex-1"} ${SQUIRCLE_LG} bg-indigo-950/35 px-6 py-3 font-medium text-slate-400 hover:bg-indigo-950/50`}
          >
            {onRestart ? "返回主页" : "关闭"}
          </button>
        </div>
      </div>
    </TintedOverlay>,
    document.body,
  );
}
