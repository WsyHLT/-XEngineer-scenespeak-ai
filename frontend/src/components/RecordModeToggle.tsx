"use client";

import type { RecordMode } from "@/hooks/useAudioRecorder";

type Props = {
  mode: RecordMode;
  onChange: (mode: RecordMode) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
};

export default function RecordModeToggle({ mode, onChange, disabled, variant = "light" }: Props) {
  const isHold = mode === "hold";
  const dark = variant === "dark";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(isHold ? "toggle" : "hold")}
      title={
        isHold
          ? "按住说话（点击切换为点击录音）"
          : "点击录音（点击切换为按住说话）"
      }
      aria-label={isHold ? "切换为点击录音" : "切换为按住说话"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        dark
          ? "border-white/10 bg-white/[0.03] text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300"
          : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
      }`}
    >
      {isHold ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 100 3m0-3a1.5 1.5 0 110 3m6-3v2.5m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 100 3m0-3a1.5 1.5 0 110 3" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )}
    </button>
  );
}
