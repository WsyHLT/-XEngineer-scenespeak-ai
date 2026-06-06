"use client";

import { useMemo, useState } from "react";

import HistoryStream from "@/components/cockpit/HistoryStream";
import ScenarioCard from "@/components/cockpit/ScenarioCard";
import {
  CATEGORY_TABS,
  MOCK_HISTORY,
  SCENARIO_MATRIX,
  type CockpitScenario,
  type SceneCategory,
} from "@/lib/cockpitMockData";

type Props = {
  loading?: boolean;
  onSelectScenario: (scenario: CockpitScenario) => void;
};

export default function ScenarioMatrix({ loading, onSelectScenario }: Props) {
  const [category, setCategory] = useState<SceneCategory>("all");

  const filtered = useMemo(() => {
    if (category === "all") return SCENARIO_MATRIX;
    return SCENARIO_MATRIX.filter((s) => s.category === category);
  }, [category]);

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">场景探索矩阵</h2>
          <p className="text-xs text-slate-500">选择维度，进入沉浸式口语时空</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                category === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-neon"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              disabled={loading}
              onClick={() => onSelectScenario(scenario)}
            />
          ))}
        </div>
      )}

      <HistoryStream records={MOCK_HISTORY} />
    </section>
  );
}
