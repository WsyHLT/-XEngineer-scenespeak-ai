"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconInfo } from "@/components/ui/CyberIcons";
import { SQUIRCLE_LG } from "@/lib/designSystem";

const TIPS = [
  { title: "难度", lines: ["初级 · 慢速简单", "中级 · 默认节奏", "高级 · 追问更严"] },
  { title: "口音", lines: ["美式 US · 北美日常", "英式 UK · 英联邦场景", "考官 · 雅思/托福风格"] },
] as const;

export default function DifficultyAccentTips() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const syncPos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    syncPos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", syncPos);
    window.addEventListener("scroll", syncPos, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", syncPos);
      window.removeEventListener("scroll", syncPos, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, syncPos]);

  const popover =
    open && mounted ? (
      <>
        <button
          type="button"
          aria-label="关闭说明"
          className="fixed inset-0 z-[99998] bg-indigo-950/20 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
        <div
          role="tooltip"
          className={`fixed z-[99999] w-[220px] ${SQUIRCLE_LG} bg-indigo-950/90 p-3 shadow-depth-lg backdrop-blur-xl`}
          style={{ top: pos.top, right: pos.right }}
        >
          {TIPS.map((block, i) => (
            <div key={block.title} className={i > 0 ? "mt-3 pt-3 border-t border-white/5" : ""}>
              <p className="mb-1.5 text-[10px] font-semibold text-indigo-300/80">{block.title}</p>
              <ul className="space-y-1">
                {block.lines.map((line) => (
                  <li key={line} className="text-[10px] leading-snug text-slate-400">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </>
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="查看难度与口音说明"
        className={`flex h-8 items-center gap-1.5 ${SQUIRCLE_LG} px-2.5 text-[10px] transition-colors ${
          open
            ? "bg-indigo-500/15 text-indigo-200/90"
            : "bg-indigo-950/20 text-slate-500 hover:bg-indigo-950/35 hover:text-slate-400"
        }`}
      >
        <IconInfo className="h-3 w-3 shrink-0 opacity-80" />
        说明
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
