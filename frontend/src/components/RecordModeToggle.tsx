"use client";

import type { RecordMode } from "@/hooks/useAudioRecorder";
import { IconHold, IconTap } from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";

type Props = {
  mode: RecordMode;
  onChange: (mode: RecordMode) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
};

export default function RecordModeToggle({ mode, onChange, disabled, variant = "light" }: Props) {
  const isHold = mode === "hold";
  const dark = variant === "dark";

  if (dark) {
    return (
      <IconShell
        size="lg"
        disabled={disabled}
        onClick={() => onChange(isHold ? "toggle" : "hold")}
        title={
          isHold
            ? "按住说话（点击切换为点击录音）"
            : "点击录音（点击切换为按住说话）"
        }
        aria-label={isHold ? "切换为点击录音" : "切换为按住说话"}
      >
        {isHold ? <IconHold /> : <IconTap />}
      </IconShell>
    );
  }

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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isHold ? <IconHold className="h-4 w-4" /> : <IconTap className="h-4 w-4" />}
    </button>
  );
}
