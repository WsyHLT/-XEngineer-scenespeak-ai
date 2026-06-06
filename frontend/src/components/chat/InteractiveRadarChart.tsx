"use client";

import { useCallback, useId, useState } from "react";

import type { SkillScores } from "@/lib/cockpitMockData";

const AXES: { key: keyof SkillScores; label: string }[] = [
  { key: "pronunciation", label: "发音" },
  { key: "grammar", label: "语法" },
  { key: "vocabulary", label: "词汇" },
  { key: "fluency", label: "流畅度" },
  { key: "coherence", label: "连贯性" },
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function poly(values: number[], cx: number, cy: number, maxR: number) {
  const step = 360 / values.length;
  return values
    .map((v, i) => {
      const { x, y } = polar(cx, cy, (v / 100) * maxR, i * step);
      return `${x},${y}`;
    })
    .join(" ");
}

type Props = {
  skills: SkillScores;
  compact?: boolean;
};

export default function InteractiveRadarChart({ skills, compact = false }: Props) {
  const uid = useId().replace(/:/g, "");
  const cx = 110;
  const cy = 100;
  const maxR = 68;
  const values = AXES.map((a) => skills[a.key]);
  const [hovered, setHovered] = useState<number | null>(null);

  const handleLeave = useCallback(() => setHovered(null), []);

  const tooltip =
    hovered !== null
      ? {
          label: AXES[hovered].label,
          score: values[hovered],
          ...polar(cx, cy, maxR + 28, hovered * (360 / AXES.length)),
        }
      : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md ${
        compact ? "" : "shadow-[0_0_32px_rgba(99,102,241,0.08)]"
      }`}
      onMouseLeave={handleLeave}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/80">
          口语能力雷达
        </p>
        <span className="text-[10px] text-slate-500">悬浮查看分数</span>
      </div>

      <div className="relative">
        <svg viewBox="0 0 220 200" className="mx-auto h-44 w-full">
          <defs>
            <linearGradient id={`radarFill-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id={`radarGlow-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
            </linearGradient>
            <filter id={`radarBlur-${uid}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 全息底光 */}
          <ellipse
            cx={cx}
            cy={cy + 8}
            rx={maxR + 12}
            ry={maxR * 0.35}
            fill="rgba(99,102,241,0.08)"
            className="animate-pulse"
          />

          {/* 旋转外环 */}
          <circle
            cx={cx}
            cy={cy}
            r={maxR + 10}
            fill="none"
            stroke="rgba(129,140,248,0.15)"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="animate-ring-spin origin-center"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {[25, 50, 75, 100].map((lv) => (
            <polygon
              key={lv}
              points={poly(Array(AXES.length).fill(lv), cx, cy, maxR)}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
            />
          ))}

          {AXES.map((_, i) => {
            const { x, y } = polar(cx, cy, maxR, i * (360 / AXES.length));
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={hovered === i ? "rgba(129,140,248,0.45)" : "rgba(255,255,255,0.06)"}
              />
            );
          })}

          {/* 多层 3D 叠加 */}
          <polygon
            points={poly(values.map((v) => v * 0.72), cx, cy, maxR)}
            fill={`url(#radarGlow-${uid})`}
            opacity="0.35"
            filter={`url(#radarBlur-${uid})`}
          />
          <polygon
            points={poly(values.map((v) => v * 0.88), cx, cy, maxR)}
            fill="rgba(168,85,247,0.12)"
            stroke="rgba(168,85,247,0.25)"
            strokeWidth="0.5"
          />
          <polygon
            points={poly(values, cx, cy, maxR)}
            fill={`url(#radarFill-${uid})`}
            stroke="#818cf8"
            strokeWidth="1.5"
            className="drop-shadow-[0_0_12px_rgba(129,140,248,0.45)]"
          />

          {/* 顶点交互热区 + 发光点 */}
          {AXES.map(({ key, label }, i) => {
            const score = skills[key];
            const pt = polar(cx, cy, (score / 100) * maxR, i * (360 / AXES.length));
            const labelPt = polar(cx, cy, maxR + 18, i * (360 / AXES.length));
            const active = hovered === i;

            return (
              <g key={key}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(i)}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={active ? 5 : 3.5}
                  fill={active ? "#a78bfa" : "#818cf8"}
                  className={active ? "drop-shadow-[0_0_8px_rgba(167,139,250,0.9)]" : ""}
                />
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-[9px] transition-fill ${active ? "fill-indigo-200" : "fill-slate-400"}`}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-indigo-500/30 bg-[#0B0F19]/95 px-2.5 py-1.5 text-xs shadow-[0_0_20px_rgba(99,102,241,0.35)] backdrop-blur-md"
            style={{
              left: `${(tooltip.x / 220) * 100}%`,
              top: `${(tooltip.y / 200) * 100}%`,
            }}
          >
            <span className="font-medium text-indigo-200">{tooltip.label}</span>
            <span className="ml-1.5 tabular-nums text-white">{tooltip.score}分</span>
          </div>
        )}
      </div>
    </div>
  );
}
