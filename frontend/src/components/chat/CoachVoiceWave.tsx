"use client";

type Props = {
  active?: boolean;
  mode: "speaking" | "listening" | "idle";
  color?: string;
  /** linear 细条声波 | 3d 高低错落立体声波（speaking 专用） */
  variant?: "linear" | "3d";
};

export default function CoachVoiceWave({
  active,
  mode,
  color = "139, 92, 246",
  variant = "linear",
}: Props) {
  const barCount = variant === "3d" ? 20 : 16;
  const dim = mode === "listening";

  return (
    <div
      className={`flex items-end justify-center gap-[3px] ${
        variant === "3d" ? "h-10 perspective-[200px]" : "h-8"
      }`}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const heightPct =
          variant === "3d"
            ? 25 + Math.abs(Math.sin(i * 0.55)) * 55 + (i % 3) * 8
            : 30 + (i % 4) * 14;

        return (
          <span
            key={i}
            className={`origin-bottom rounded-full transition-all duration-300 ${
              variant === "3d" ? "w-[3px]" : "w-1"
            } ${
              active && !dim
                ? variant === "3d"
                  ? "animate-wave-3d"
                  : "animate-wave-bar"
                : dim
                  ? "opacity-45"
                  : "opacity-20"
            }`}
            style={{
              height: `${heightPct}%`,
              background:
                mode === "listening"
                  ? "linear-gradient(to top, rgb(34,197,94), rgb(74,222,128))"
                  : `linear-gradient(to top, rgba(${color},0.45), rgba(${color},1))`,
              boxShadow:
                active && !dim && variant === "3d"
                  ? `0 0 8px rgba(${color},0.55)`
                  : undefined,
              animationDelay: active ? `${(i * 0.05) % 0.85}s` : undefined,
              animationDuration: active
                ? variant === "3d"
                  ? `${0.55 + (i % 7) * 0.06}s`
                  : `${0.7 + (i % 5) * 0.07}s`
                : undefined,
              transform: variant === "3d" && active ? `rotateX(${((i % 5) - 2) * 4}deg)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
