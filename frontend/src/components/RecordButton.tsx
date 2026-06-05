"use client";

import type { RecordMode } from "@/hooks/useAudioRecorder";

type Props = {
  mode: RecordMode;
  isRecording: boolean;
  isProcessing: boolean;
  statusLabel?: string;
  disabled?: boolean;
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
  onPressStart,
  onPressEnd,
  onToggle,
}: Props) {
  const handlers =
    mode === "hold"
      ? {
          onMouseDown: () => !disabled && !isProcessing && onPressStart(),
          onMouseUp: () => onPressEnd(),
          onMouseLeave: () => isRecording && onPressEnd(),
          onTouchStart: (e: React.TouchEvent) => {
            e.preventDefault();
            if (!disabled && !isProcessing) onPressStart();
          },
          onTouchEnd: (e: React.TouchEvent) => {
            e.preventDefault();
            onPressEnd();
          },
        }
      : {
          onClick: () => !disabled && !isProcessing && onToggle(),
        };

  const hint =
    statusLabel ??
    (isProcessing
      ? "AI 思考中…"
      : isRecording
        ? mode === "hold"
          ? "松开结束"
          : "点击停止"
        : mode === "hold"
          ? "按住说话"
          : "点击录音");

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled || isProcessing}
        aria-label={isRecording ? "停止录音" : "开始录音"}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50 ${
          isRecording
            ? "scale-110 bg-red-500 shadow-red-300/50 animate-pulse"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-300/50 hover:scale-105"
        }`}
        {...handlers}
      >
        {isProcessing ? (
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
        ) : isRecording ? (
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="h-9 w-9 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V19H9a1 1 0 100 2h6a1 1 0 100-2h-2v-1.08A7 7 0 0019 11z" />
          </svg>
        )}

        {isRecording && (
          <span className="absolute -inset-2 rounded-full border-2 border-red-400/40 animate-ping" />
        )}
      </button>

      <p className="text-center text-sm text-slate-500">{hint}</p>
    </div>
  );
}
