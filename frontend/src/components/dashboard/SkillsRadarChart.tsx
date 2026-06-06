"use client";

import type { SkillScores } from "@/lib/dashboardMockData";

const LABELS: { key: keyof SkillScores; label: string }[] = [
  { key: "pronunciation", label: "发音" },
  { key: "grammar", label: "语法" },
  { key: "vocabulary", label: "词汇量" },
  { key: "fluency", label: "流畅度" },
  { key: "coherence", label: "连贯性" },
];

type Props = {
  skills: SkillScores;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function radarPolygon(values: number[], cx: number, cy: number, maxR: number) {
  const step = 360 / values.length;
  return values
    .map((v, i) => {
      const r = (v / 100) * maxR;
      const { x, y } = polarToCartesian(cx, cy, r, i * step);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function SkillsRadarChart({ skills }: Props) {
  const cx = 120;
  const cy = 110;
  const maxR = 72;
  const values = LABELS.map(({ key }) => skills[key]);
  const levels = [25, 50, 75, 100];

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">口语能力雷达</h3>
      <svg viewBox="0 0 240 220" className="mx-auto h-52 w-full max-w-xs">
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={radarPolygon(Array(LABELS.length).fill(lv), cx, cy, maxR)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {LABELS.map((_, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR, i * (360 / LABELS.length));
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polygon
          points={radarPolygon(values, cx, cy, maxR)}
          fill="rgba(99, 102, 241, 0.25)"
          stroke="#6366f1"
          strokeWidth="2"
        />
        {values.map((v, i) => {
          const r = (v / 100) * maxR;
          const { x, y } = polarToCartesian(cx, cy, r, i * (360 / LABELS.length));
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#6366f1" />;
        })}
        {LABELS.map(({ label }, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR + 22, i * (360 / LABELS.length));
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-600 text-[10px] font-medium"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
            <span>{label}</span>
            <span className="font-semibold tabular-nums text-indigo-600">{skills[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
