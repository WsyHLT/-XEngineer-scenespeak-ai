"use client";

import { useEffect, useRef, useState } from "react";

import type { VoiceProfile } from "@/lib/voiceProfiles";

type Props = {
  currentVoice: VoiceProfile;
  voices: VoiceProfile[];
  onChange: (voice: VoiceProfile) => void;
  /** compact: 顶栏图标 | panel: 卡片内嵌 */
  variant?: "compact" | "panel";
};

export default function VoiceTimbreSelector({
  currentVoice,
  voices,
  onChange,
  variant = "compact",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const triggerClass =
    variant === "panel"
      ? "flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left transition-colors hover:border-indigo-500/30"
      : "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/10";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        title="切换 AI 音色"
        aria-expanded={open}
      >
        {variant === "compact" ? (
          <>
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden text-slate-300 sm:inline">
              {currentVoice.emoji} {currentVoice.label}
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-400">
              {currentVoice.emoji} {currentVoice.label}
            </span>
            <span className="text-[10px] text-slate-600">{currentVoice.subtitle}</span>
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 min-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-[#0B0F19]/95 shadow-[0_0_32px_rgba(99,102,241,0.2)] backdrop-blur-xl ${
            variant === "panel" ? "left-0 right-0 top-full mt-2" : "right-0 top-full mt-2"
          }`}
        >
          <p className="border-b border-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-400/80">
            AI 音色定制
          </p>
          <ul className="max-h-64 overflow-y-auto py-1">
            {voices.map((v) => {
              const active = v.id === currentVoice.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-indigo-500/15 text-indigo-200"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    <span className="text-lg leading-none">{v.emoji}</span>
                    <span>
                      <span className="block text-sm font-medium">{v.label}</span>
                      <span className="text-[10px] text-slate-500">{v.subtitle}</span>
                      <span className="mt-0.5 block font-mono text-[9px] text-slate-600">
                        ID: {v.voiceId}
                      </span>
                    </span>
                    {active && (
                      <span className="ml-auto mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
