"use client";

import type { RecordMode } from "@/hooks/useAudioRecorder";

type Props = {
  mode: RecordMode;
  isRecording: boolean;
  isProcessing: boolean;
  statusLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onToggle: () => void;
};

export default function RecordButton({
  mode,
  isRecording,
  isProcessing,
  statusLabel,
  disabled,
  compact = false,
  onPressStart,
  onPressEnd,
  onToggle,
}: Props) {
  const handlers =
    mode === "hold"
      ? {
          onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
            if (disabled || isProcessing || e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            onPressStart();
          },
          onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            onPressEnd();
          },
          onPointerCancel: () => onPressEnd(),
        }
      : {
          onClick: () => !disabled && !isProcessing && onToggle(),
        };

  const hint =
    statusLabel ??
    (isProcessing
      ? "处理中"
      : isRecording
        ? mode === "hold"
          ? "松开结束"
          : "停止"
        : mode === "hold"
          ? "按住说话"
          : "录音");

  const sizeClass = compact ? "h-11 w-11 shrink-0" : "h-16 w-16";
  const iconClass = compact ? "h-5 w-5" : "h-7 w-7";
  const spinClass = compact ? "h-5 w-5 border-2" : "h-7 w-7 border-[3px]";

  const button = (
    <button
      type="button"
      disabled={disabled || isProcessing}
      aria-label={isRecording ? "停止录音" : "开始录音"}
      title={hint}
      className={`relative flex ${sizeClass} touch-none select-none items-center justify-center rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        isRecording
          ? "scale-105 bg-red-500 shadow-red-300/40 animate-pulse"
          : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-300/40 hover:scale-105"
      }`}
      {...handlers}
    >
      {isProcessing ? (
        <div
          className={`${spinClass} animate-spin rounded-full border-white/30 border-t-white`}
        />
      ) : isRecording ? (
        <svg className={`${iconClass} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className={`${iconClass} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
          <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V19H9a1 1 0 100 2h6a1 1 0 100-2h-2v-1.08A7 7 0 0019 11z" />
        </svg>
      )}

      {isRecording && !compact && (
        <span className="absolute -inset-1.5 rounded-full border-2 border-red-400/40 animate-ping" />
      )}
    </button>
  );

  if (compact) {
    return button;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {button}
      <p className="text-center text-xs text-slate-500">{hint}</p>
    </div>
  );
}
