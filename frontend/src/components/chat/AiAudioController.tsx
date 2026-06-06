"use client";

import { useCallback, useRef, useState } from "react";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type AiAudioControllerProps = {
  /** 该气泡是否为当前音频会话（控制条始终显示） */
  isSessionMessage: boolean;
  isAudioPlaying: boolean;
  isPaused: boolean;
  playbackState?: "idle" | "playing" | "paused" | "stopped" | "ended";
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  showTranslation: boolean;
  translationZh?: string;
  onToggleTranslation: () => void;
  onSeek: (ratio: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReplay: () => void;
};

export default function AiAudioController({
  isSessionMessage,
  isAudioPlaying,
  isPaused,
  playbackState = "idle",
  audioProgress,
  audioCurrentTime,
  audioDuration,
  showTranslation,
  translationZh,
  onToggleTranslation,
  onSeek,
  onPause,
  onResume,
  onStop,
  onReplay,
}: AiAudioControllerProps) {
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const displayProgress = dragProgress ?? audioProgress;
  const remaining = Math.max(0, audioDuration - (dragProgress !== null ? (dragProgress / 100) * audioDuration : audioCurrentTime));

  const commitSeek = useCallback(
    (ratio: number) => {
      onSeek(ratio);
      setDragProgress(null);
      draggingRef.current = false;
    },
    [onSeek],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      if (!isSessionMessage) return;
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const ratio = Number(e.currentTarget.value) / 100;
      setDragProgress(ratio * 100);
    },
    [isSessionMessage],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      if (!draggingRef.current) return;
      setDragProgress(Number(e.currentTarget.value));
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      if (!draggingRef.current) return;
      commitSeek(Number(e.currentTarget.value) / 100);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [commitSeek],
  );

  const showPlayButton =
    isSessionMessage &&
    (isPaused || playbackState === "paused" || playbackState === "stopped");
  const canPause = isSessionMessage && isAudioPlaying && !showPlayButton;

  return (
    <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {!translationZh ? (
            <p className="text-[11px] italic text-slate-600">正在生成中文翻译…</p>
          ) : showTranslation ? (
            <p className="text-[13px] leading-relaxed text-slate-500">{translationZh}</p>
          ) : (
            <p className="text-[11px] italic text-slate-600">中文翻译已隐藏 · 点击眼睛查看</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleTranslation}
          disabled={!translationZh}
          title={showTranslation ? "隐藏中文翻译" : "显示中文翻译"}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
            showTranslation
              ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
              : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
          }`}
          aria-label={showTranslation ? "隐藏翻译" : "显示翻译"}
        >
          {showTranslation ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/25 px-2.5 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={onReplay}
          title="重复听"
          className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 transition-colors ${
            isAudioPlaying
              ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
              : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300"
          }`}
          aria-label="重复听"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[10px] font-medium">重复听</span>
        </button>

        {showPlayButton ? (
          <button
            type="button"
            onClick={onResume}
            title="继续播放"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
            aria-label="继续播放"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            disabled={!canPause}
            title="暂停"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-35"
            aria-label="暂停"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={onStop}
          disabled={!isSessionMessage}
          title="停止（保留进度条）"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-35"
          aria-label="停止播放"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        {isSessionMessage ? (
          <>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={displayProgress}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDragProgress(v);
                if (!draggingRef.current) commitSeek(v / 100);
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="audio-progress-range min-w-0 flex-1 cursor-pointer"
              aria-label="播放进度"
            />
            <span className="shrink-0 tabular-nums text-[10px] text-slate-500">
              {isAudioPlaying ? `-${formatTime(remaining)}` : formatTime(audioCurrentTime)}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-[10px] text-slate-600">点击「重复听」开始播放</span>
        )}
      </div>
    </div>
  );
}
