"use client";

import CoachVoiceWave from "@/components/chat/CoachVoiceWave";
import ThinkingDots from "@/components/chat/ThinkingDots";
import type { AiStatus } from "@/hooks/useCoachSessionUI";
import { AI_STATUS_LABEL } from "@/hooks/useCoachSessionUI";
import type { CoachPersona } from "@/lib/coachPersonas";

type Props = {
  persona: CoachPersona;
  /** 三态：listening | thinking | speaking */
  aiStatus: AiStatus;
  sceneIcon?: string | null;
  /** 副状态文案（识别中、核对中等） */
  statusHint?: string;
};

function CyberAvatarSvg() {
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" fill="none" aria-hidden>
      <defs>
        <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="avatarGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="100" cy="200" rx="70" ry="12" fill="rgba(99,102,241,0.15)" />
      <path
        d="M100 40c-28 0-50 22-50 50 0 18 8 34 22 44v26h56v-26c14-10 22-26 22-44 0-28-22-50-50-50z"
        fill="url(#avatarGrad)"
        opacity="0.95"
        filter="url(#avatarGlow)"
      />
      <circle cx="82" cy="88" r="6" fill="#0B0F19" opacity="0.55" />
      <circle cx="118" cy="88" r="6" fill="#0B0F19" opacity="0.55" />
      <path d="M88 108 Q100 118 112 108" stroke="#0B0F19" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <rect x="70" y="160" width="60" height="40" rx="8" fill="url(#avatarGrad)" opacity="0.45" />
      <path d="M60 175 L40 200 M140 175 L160 200" stroke="url(#avatarGrad)" strokeWidth="8" strokeLinecap="round" />
      {/* 赛博耳麦装饰 */}
      <path d="M55 95 Q45 100 45 115" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
      <path d="M145 95 Q155 100 155 115" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

export default function CoachAvatarPanel({
  persona,
  aiStatus,
  sceneIcon,
  statusHint,
}: Props) {
  const statusColor =
    aiStatus === "speaking"
      ? "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"
      : aiStatus === "thinking"
        ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse"
        : "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse";

  const statusCaption =
    statusHint ??
    (aiStatus === "speaking"
      ? "AI 正在用英文朗读回复…"
      : aiStatus === "thinking"
        ? "AI 正在组织回答…"
        : "轮到你了 — 按住下方麦克风开口");

  return (
    <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:min-h-0 lg:flex-1">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: `rgba(${persona.glowRgb}, 0.22)` }}
      />

      <div className="relative mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400/80">
            Live Session
          </p>
          <h2 className="text-lg font-bold text-white">{persona.roleTitle}</h2>
          <p className="text-xs text-slate-500">{persona.tagline}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] font-medium capitalize text-slate-300">
            {AI_STATUS_LABEL[aiStatus]}
          </span>
        </div>
      </div>

      <div className="relative mx-auto flex flex-1 flex-col items-center justify-center">
        {/* listening — 绿色呼吸灯 */}
        {aiStatus === "listening" && (
          <span className="absolute h-52 w-52 animate-pulse rounded-full border-2 border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_40px_rgba(34,197,94,0.12)]" />
        )}

        {/* thinking — 环形流光旋转 */}
        {aiStatus === "thinking" && (
          <>
            <span className="absolute h-52 w-52 animate-ring-spin rounded-full border-2 border-indigo-500/15 border-t-indigo-400 border-r-sky-400/80 shadow-[0_0_30px_rgba(129,140,248,0.15)]" />
            <span
              className="absolute h-56 w-56 animate-ring-spin rounded-full border border-violet-500/10 border-b-violet-400/40"
              style={{ animationDirection: "reverse", animationDuration: "4.5s" }}
            />
          </>
        )}

        {/* speaking — 波纹扩散 */}
        {aiStatus === "speaking" && (
          <>
            <span className="absolute h-48 w-48 animate-ripple rounded-full border border-violet-500/35" />
            <span
              className="absolute h-56 w-56 animate-ripple rounded-full border border-blue-400/25"
              style={{ animationDelay: "0.55s" }}
            />
            <span
              className="absolute h-64 w-64 animate-ripple rounded-full border border-purple-500/15"
              style={{ animationDelay: "1.1s" }}
            />
          </>
        )}

        <div
          className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-br p-1 shadow-neon ${persona.gradient}`}
          style={{ borderColor: `rgba(${persona.glowRgb}, 0.45)` }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0B0F19]/85 backdrop-blur-sm">
            {sceneIcon && sceneIcon.length <= 4 ? (
              <span className="text-6xl drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]">{sceneIcon}</span>
            ) : (
              <CyberAvatarSvg />
            )}
          </div>
        </div>

        <div className="mt-6 flex min-h-[2rem] w-full max-w-xs flex-col items-center justify-center">
          {aiStatus === "thinking" ? (
            <ThinkingDots />
          ) : (
            <CoachVoiceWave
              active={aiStatus === "speaking" || aiStatus === "listening"}
              mode={aiStatus === "speaking" ? "speaking" : aiStatus === "listening" ? "listening" : "idle"}
              color={persona.glowRgb}
              variant={aiStatus === "speaking" ? "3d" : "linear"}
            />
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3 text-center backdrop-blur-sm">
        <p className="text-[11px] text-slate-500">{statusCaption}</p>
      </div>
    </div>
  );
}
