"use client";

type Props = {
  className?: string;
};

/** AI 思考态 — 带微光的三点跳动加载器 */
export default function ThinkingDots({ className = "" }: Props) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 ${className}`}
      aria-label="AI thinking"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)] animate-dot-bounce"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
