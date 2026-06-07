"use client";

import MicDeviceSelect from "@/components/MicDeviceSelect";
import RecordButton from "@/components/RecordButton";
import RecordModeToggle from "@/components/RecordModeToggle";
import { IconMic } from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";
import type { RecordMode } from "@/hooks/useAudioRecorder";
import { SQUIRCLE_LG } from "@/lib/designSystem";

export type CyberControlBarProps = {
  hints: string[];
  textInput: string;
  onTextChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onHintClick: (hint: string) => void;
  recordMode: RecordMode;
  onRecordModeChange: (m: RecordMode) => void;
  isUserSpeaking: boolean;
  isBusy: boolean;
  isReviewing: boolean;
  recorderSupported: boolean;
  statusLabel?: string;
  footerStatus?: string | null;
  showMicSettings: boolean;
  onToggleMicSettings: () => void;
  onMicDeviceChange: (id: string | null) => void;
  onPressStart: () => void;
  onPressEnd: () => void;
  onToggle: () => void;
};

export default function CyberControlBar({
  hints,
  textInput,
  onTextChange,
  onSubmit,
  onHintClick,
  recordMode,
  onRecordModeChange,
  isUserSpeaking,
  isBusy,
  isReviewing,
  recorderSupported,
  statusLabel,
  footerStatus,
  showMicSettings,
  onToggleMicSettings,
  onMicDeviceChange,
  onPressStart,
  onPressEnd,
  onToggle,
}: CyberControlBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center px-4 pb-5 pt-10">
      {!isBusy && hints.length > 0 && (
        <div className="pointer-events-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-2 px-2">
          {hints.slice(0, 3).map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => onHintClick(hint)}
              className={`max-w-[280px] truncate ${SQUIRCLE_LG} bg-indigo-950/40 px-3 py-2 text-[11px] text-slate-400 shadow-depth backdrop-blur-sm transition-all hover:bg-indigo-950/55 hover:text-indigo-200/70`}
              title={`点击填入：${hint}`}
            >
              &ldquo;{hint}&rdquo;
            </button>
          ))}
        </div>
      )}

      {showMicSettings && (
        <div className={`pointer-events-auto mb-2 w-full max-w-3xl ${SQUIRCLE_LG} bg-indigo-950/50 px-3 py-2 shadow-depth backdrop-blur-md`}>
          <MicDeviceSelect onDeviceChange={onMicDeviceChange} variant="dark" />
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={`pointer-events-auto flex w-full max-w-3xl items-center gap-2 rounded-full bg-indigo-950/55 px-4 py-3 shadow-depth-lg backdrop-blur-xl sm:px-6`}
      >
        <RecordModeToggle
          mode={recordMode}
          onChange={onRecordModeChange}
          disabled={isBusy || isUserSpeaking}
          variant="dark"
        />

        <div className="relative flex shrink-0 items-center justify-center px-1">
          {isUserSpeaking && (
            <>
              <span className={`absolute h-16 w-16 animate-mic-pulse ${SQUIRCLE_LG} border border-violet-400/30`} />
              <span
                className={`absolute h-[4.5rem] w-[4.5rem] animate-mic-pulse ${SQUIRCLE_LG} border border-indigo-500/20`}
                style={{ animationDelay: "0.35s" }}
              />
            </>
          )}
          <div className={`relative ${isUserSpeaking ? "scale-125" : "scale-110"} transition-transform duration-200`}>
            <RecordButton
              compact
              variant="cyber"
              mode={recordMode}
              isRecording={isUserSpeaking}
              isProcessing={isBusy && !isUserSpeaking}
              statusLabel={statusLabel}
              disabled={isReviewing || !recorderSupported}
              onPressStart={onPressStart}
              onPressEnd={onPressEnd}
              onToggle={onToggle}
            />
          </div>
        </div>

        <input
          type="text"
          value={textInput}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Type English or hold mic…"
          disabled={isBusy}
          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-slate-50 placeholder:text-slate-500 outline-none focus:ring-0 disabled:opacity-50"
        />

        <IconShell size="lg" active={showMicSettings} onClick={onToggleMicSettings} title="麦克风设置">
          <IconMic />
        </IconShell>

        <button
          type="submit"
          disabled={isBusy || !textInput.trim()}
          className={`shrink-0 ${SQUIRCLE_LG} bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-slate-50 shadow-depth transition-opacity disabled:opacity-40`}
        >
          发送
        </button>
      </form>

      {footerStatus && (
        <p
          className="pointer-events-auto mt-2 max-w-3xl truncate text-center font-data text-[10px] text-slate-500"
          title={footerStatus}
        >
          {footerStatus}
        </p>
      )}
    </div>
  );
}
