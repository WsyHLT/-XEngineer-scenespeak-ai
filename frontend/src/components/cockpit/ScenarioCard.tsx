"use client";

import type { CockpitScenario } from "@/lib/cockpitMockData";

type Props = {
  scenario: CockpitScenario;
  onClick: () => void;
  disabled?: boolean;
};

export default function ScenarioCard({ scenario, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl p-[1px] text-left transition-all duration-500 hover:-translate-y-1.5 disabled:cursor-wait disabled:opacity-60 ${scenario.accent}`}
    >
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br opacity-60 transition-opacity duration-500 group-hover:opacity-100 ${scenario.gradient}`}
      />
      <div className="relative flex h-full flex-col rounded-2xl bg-[#0B0F19]/90 p-5 backdrop-blur-md">
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-2xl shadow-lg ${scenario.gradient}`}
        >
          {scenario.icon}
        </div>
        <h3 className="text-lg font-bold text-white">{scenario.name_zh}</h3>
        <p className="text-[11px] font-medium text-indigo-300/70">{scenario.name}</p>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
          {scenario.description}
        </p>
        <span
          className={`mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r px-3 py-1.5 text-xs font-semibold text-white opacity-90 transition-all group-hover:opacity-100 ${scenario.gradient}`}
        >
          进入时空舱
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </button>
  );
}
