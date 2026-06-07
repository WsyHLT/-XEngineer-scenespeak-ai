"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import CategoryTabBar from "@/components/cockpit/CategoryTabBar";
import HistoryStream from "@/components/cockpit/HistoryStream";
import ReportDetailModal from "@/components/ReportDetailModal";
import ScenarioCard from "@/components/cockpit/ScenarioCard";
import {
  CATEGORY_TABS,
  SCENARIO_MATRIX,
  type CockpitScenario,
  type SceneCategory,
} from "@/lib/cockpitMockData";
import {
  filterHistoryByScene,
  isNearHistoryLimit,
} from "@/lib/historyAnalytics";
import { subscribeHistoryChanged } from "@/lib/historyEvents";
import {
  clearPracticeHistory,
  deleteHistoryRecord,
  getHistoryReportById,
  getRealHistoryCount,
  historyReportToDetail,
  loadHistoryRecords,
} from "@/lib/practiceHistoryStore";
import type { ReportDetailData } from "@/types/history";
import type { SceneId } from "@/types/api";

type Props = {
  loading?: boolean;
  onSelectScenario: (scenario: CockpitScenario) => void;
};

export default function ScenarioMatrix({ loading, onSelectScenario }: Props) {
  const [category, setCategory] = useState<SceneCategory>("all");
  const [sceneFilter, setSceneFilter] = useState<SceneId | "all">("all");
  const [activeReport, setActiveReport] = useState<ReportDetailData | null>(null);
  const [historyRecords, setHistoryRecords] = useState(() => loadHistoryRecords());
  const [confirmClear, setConfirmClear] = useState(false);

  const refreshHistory = useCallback(() => {
    setHistoryRecords(loadHistoryRecords());
  }, []);

  useEffect(() => {
    refreshHistory();
    return subscribeHistoryChanged(() => refreshHistory());
  }, [refreshHistory]);

  const filteredScenarios = useMemo(() => {
    if (category === "all") return SCENARIO_MATRIX;
    return SCENARIO_MATRIX.filter((s) => s.category === category);
  }, [category]);

  const filteredHistory = useMemo(
    () => filterHistoryByScene(historyRecords, sceneFilter),
    [historyRecords, sceneFilter],
  );

  const showLimitWarning = isNearHistoryLimit(getRealHistoryCount());

  const handleDelete = (id: string) => {
    if (window.confirm("确定删除这条练习记录吗？")) {
      deleteHistoryRecord(id);
    }
  };

  const handleClearAll = () => {
    setConfirmClear(true);
  };

  const confirmClearAll = () => {
    clearPracticeHistory();
    setConfirmClear(false);
  };

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-50">场景探索矩阵</h2>
          <p className="mt-1 text-xs text-slate-500">选择维度，进入沉浸式口语时空</p>
        </div>
        <CategoryTabBar tabs={CATEGORY_TABS} active={category} onChange={setCategory} />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-400/80" />
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              disabled={loading}
              onClick={() => onSelectScenario(scenario)}
            />
          ))}
        </div>
      )}

      <HistoryStream
        records={filteredHistory}
        sceneFilter={sceneFilter}
        onSceneFilterChange={setSceneFilter}
        showLimitWarning={showLimitWarning}
        onView={(id) => {
          const report = getHistoryReportById(id);
          if (report) setActiveReport(historyReportToDetail(report));
        }}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />

      {activeReport && (
        <ReportDetailModal
          report={activeReport}
          title="历史练习报告"
          onClose={() => setActiveReport(null)}
        />
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E1424] p-6 shadow-depth-lg">
            <h3 className="text-base font-bold text-slate-50">清空全部历史？</h3>
            <p className="mt-2 text-sm text-slate-400">
              此操作不可撤销，所有练习记录与纠错报告将被永久删除。
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm text-slate-400"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="flex-1 rounded-xl bg-rose-600/80 py-2.5 text-sm font-medium text-white"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
