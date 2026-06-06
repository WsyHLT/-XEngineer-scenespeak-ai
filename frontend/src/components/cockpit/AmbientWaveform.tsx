"use client";

const BAR_COUNT = 24;

export default function AmbientWaveform() {
  return (
    <div className="relative flex h-28 items-end justify-center gap-[3px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-950/40 to-transparent px-4 py-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18),transparent_70%)]" />
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="w-1 origin-bottom rounded-full bg-gradient-to-t from-blue-500 via-violet-400 to-fuchsia-400 animate-wave-bar"
          style={{
            height: `${28 + (i % 5) * 12}%`,
            animationDelay: `${(i * 0.07) % 1.2}s`,
            animationDuration: `${0.9 + (i % 7) * 0.08}s`,
          }}
        />
      ))}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.25em] text-indigo-300/70">
        Live Voice Stream
      </div>
    </div>
  );
}
