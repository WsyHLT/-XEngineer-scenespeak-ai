"use client";

import { useCallback, useRef, useState } from "react";

import {
  IconEye,
  IconEyeOff,
  IconPause,
  IconPlay,
  IconRefresh,
  IconStop,
} from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";
import { FONT_DATA, SQUIRCLE_LG } from "@/lib/designSystem";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type AiAudioControllerProps = {
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
  const remaining = Math.max(
    0,
    audioDuration -
      (dragProgress !== null ? (dragProgress / 100) * audioDuration : audioCurrentTime),
  );

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

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    if (!draggingRef.current) return;
    setDragProgress(Number(e.currentTarget.value));
  }, []);

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
    <div className="mt-3 space-y-2.5 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {!translationZh ? (
            <p className="text-[11px] italic text-indigo-300/40">正在生成中文翻译…</p>
          ) : showTranslation ? (
            <p className="text-[13px] leading-relaxed text-indigo-200/55">{translationZh}</p>
          ) : (
            <p className="text-[11px] italic text-indigo-300/35">中文翻译已隐藏 · 点击眼睛查看</p>
          )}
        </div>
        <IconShell
          size="sm"
          active={showTranslation}
          onClick={onToggleTranslation}
          disabled={!translationZh}
          title={showTranslation ? "隐藏中文翻译" : "显示中文翻译"}
          aria-label={showTranslation ? "隐藏翻译" : "显示翻译"}
        >
          {showTranslation ? <IconEye /> : <IconEyeOff />}
        </IconShell>
      </div>

      <div className={`flex items-center gap-2 ${SQUIRCLE_LG} bg-indigo-950/25 px-2.5 py-2 backdrop-blur-sm`}>
        <button
          type="button"
          onClick={onReplay}
          title="重复听"
          className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-[10px] px-2 transition-colors ${
            isAudioPlaying
              ? "bg-indigo-500/12 text-indigo-300/80"
              : "bg-white/[0.04] text-slate-400 hover:text-indigo-300/70"
          }`}
          aria-label="重复听"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium">重复听</span>
        </button>

        {showPlayButton ? (
          <IconShell size="sm" onClick={onResume} title="继续播放" aria-label="继续播放">
            <IconPlay />
          </IconShell>
        ) : (
          <IconShell size="sm" onClick={onPause} disabled={!canPause} title="暂停" aria-label="暂停">
            <IconPause />
          </IconShell>
        )}

        <IconShell size="sm" onClick={onStop} disabled={!isSessionMessage} title="停止" aria-label="停止播放">
          <IconStop />
        </IconShell>

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
            <span className={`${FONT_DATA} shrink-0 text-[10px] text-slate-500`}>
              {isAudioPlaying ? `-${formatTime(remaining)}` : formatTime(audioCurrentTime)}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-[10px] text-indigo-300/35">点击「重复听」开始播放</span>
        )}
      </div>
    </div>
  );
}
