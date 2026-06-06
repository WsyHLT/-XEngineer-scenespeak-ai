"use client";

import MicDeviceSelect from "@/components/MicDeviceSelect";
import RecordButton from "@/components/RecordButton";
import RecordModeToggle from "@/components/RecordModeToggle";
import type { RecordMode } from "@/hooks/useAudioRecorder";

export type CyberControlBarProps = {
  /** 动态求助提示词（建议 3 条） */
  hints: string[];
  textInput: string;
  onTextChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** 点击提示词填入输入框 */
  onHintClick: (hint: string) => void;
  recordMode: RecordMode;
  onRecordModeChange: (m: RecordMode) => void;
  /** 用户正在说话 — 驱动麦克风扩圈动画 */
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
      {/* Dynamic Help Hints — 胶囊条正上方 */}
      {!isBusy && hints.length > 0 && (
        <div className="pointer-events-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-2 px-2">
          {hints.slice(0, 3).map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => onHintClick(hint)}
              className="max-w-[280px] truncate rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-400 shadow-[0_0_12px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:text-indigo-200 hover:shadow-[0_0_16px_rgba(99,102,241,0.15)]"
              title={`点击填入：${hint}`}
            >
              &ldquo;{hint}&rdquo;
            </button>
          ))}
        </div>
      )}

      {showMicSettings && (
        <div className="pointer-events-auto mb-2 w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 backdrop-blur-md">
          <MicDeviceSelect onDeviceChange={onMicDeviceChange} variant="dark" />
        </div>
      )}

      {/* Cyber Capsule Bar */}
      <form
        onSubmit={onSubmit}
        className="pointer-events-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-3 shadow-[0_0_40px_rgba(99,102,241,0.12),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-6"
      >
        <RecordModeToggle
          mode={recordMode}
          onChange={onRecordModeChange}
          disabled={isBusy || isUserSpeaking}
          variant="dark"
        />

        {/* Glow Mic — 居中放大 + 高频扩圈 */}
        <div className="relative flex shrink-0 items-center justify-center px-1">
          {isUserSpeaking && (
            <>
              <span className="absolute h-16 w-16 animate-mic-pulse rounded-full border border-violet-400/50" />
              <span
                className="absolute h-[4.5rem] w-[4.5rem] animate-mic-pulse rounded-full border border-blue-500/30"
                style={{ animationDelay: "0.35s" }}
              />
              <span
                className="absolute h-20 w-20 animate-mic-pulse rounded-full border border-purple-500/20"
                style={{ animationDelay: "0.7s" }}
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
          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:ring-0 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onToggleMicSettings}
          title="麦克风设置"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
            showMicSettings
              ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
              : "border-white/10 bg-white/[0.04] text-slate-500 hover:text-slate-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={isBusy || !textInput.trim()}
          className="shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-neon transition-opacity disabled:opacity-40"
        >
          发送
        </button>
      </form>

      {footerStatus && (
        <p
          className="pointer-events-auto mt-2 max-w-3xl truncate text-center text-[10px] text-slate-500"
          title={footerStatus}
        >
          {footerStatus}
        </p>
      )}
    </div>
  );
}
