"use client";

import type { CockpitScenario } from "@/lib/cockpitMockData";
import { SQUIRCLE_LG, TINT_CARD_HOVER } from "@/lib/designSystem";

const CARD_SHELL =
  "group relative flex min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-left " +
  "surface-elevated shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] " +
  "transition-all duration-300";

const ICON_SHELL =
  `mb-4 flex h-12 w-12 shrink-0 items-center justify-center ${SQUIRCLE_LG} text-2xl`;

const ACTION_SHELL =
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300";

type Props = {
  scenario: CockpitScenario;
  onClick: () => void;
  disabled?: boolean;
};

export default function ScenarioCard({ scenario, onClick, disabled }: Props) {
  const hoverTint = TINT_CARD_HOVER[scenario.tintPreset];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${CARD_SHELL} ${scenario.hoverGlow} disabled:cursor-wait disabled:opacity-60`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${hoverTint}`}
      />
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br opacity-[0.12] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.2] ${scenario.gradient}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-gradient-to-tr opacity-[0.06] blur-2xl ${scenario.gradient}`}
      />

      <div className="relative z-10 flex min-h-[168px] flex-1 flex-col justify-between">
        <div className="min-h-0">
          <div className={`${ICON_SHELL} ${scenario.iconClass}`}>{scenario.icon}</div>
          <h3 className="text-base font-bold text-slate-50">{scenario.name_zh}</h3>
          <p className={`text-[11px] font-medium ${scenario.subtitleClass}`}>{scenario.name}</p>
          <p className={`mt-2 line-clamp-3 text-sm leading-relaxed ${scenario.descClass}`}>
            {scenario.description}
          </p>
        </div>

        <span className={`${ACTION_SHELL} ${scenario.buttonClass}`}>
          进入时空舱
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </button>
  );
}
