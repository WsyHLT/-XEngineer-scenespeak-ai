/** 全局视觉符号与 Tailwind 类名常量 — 设计系统单一来源 */

/** Squircle 曲率：与场景卡片图标容器一致 */
export const SQUIRCLE = "rounded-[14px]" as const;
export const SQUIRCLE_LG = "rounded-2xl" as const;
export const SQUIRCLE_XL = "rounded-[18px]" as const;

/** 赛博图标微光容器 */
export const ICON_SHELL =
  "inline-flex shrink-0 items-center justify-center bg-indigo-500/10 text-indigo-300/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" as const;

export const ICON_SHELL_SM = `${ICON_SHELL} ${SQUIRCLE} h-7 w-7` as const;
export const ICON_SHELL_MD = `${ICON_SHELL} ${SQUIRCLE} h-8 w-8` as const;
export const ICON_SHELL_LG = `${ICON_SHELL} ${SQUIRCLE_LG} h-9 w-9` as const;

export const ICON_SHELL_ACTIVE =
  "bg-indigo-500/18 text-indigo-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" as const;

/** 核心动态数据 — 等宽科技字体 */
export const FONT_DATA = "font-mono tabular-nums tracking-tight" as const;

/** 统一 SVG 线宽 */
export const ICON_STROKE = 1.75;

/** 弹窗/遮罩色彩提取融合 — 拒绝纯黑蒙版 */
export type TintPreset = "indigo" | "violet" | "amber" | "cyan" | "sky" | "blue";

export const TINT_OVERLAY: Record<TintPreset, string> = {
  indigo: "bg-indigo-950/40",
  violet: "bg-violet-950/38",
  amber: "bg-amber-950/32",
  cyan: "bg-cyan-950/34",
  sky: "bg-sky-950/32",
  blue: "bg-blue-950/36",
};

export const TINT_OVERLAY_HIDDEN: Record<TintPreset, string> = {
  indigo: "bg-indigo-950/0",
  violet: "bg-violet-950/0",
  amber: "bg-amber-950/0",
  cyan: "bg-cyan-950/0",
  sky: "bg-sky-950/0",
  blue: "bg-blue-950/0",
};

/** 场景卡片 hover 内嵌色调层 */
export const TINT_CARD_HOVER: Record<TintPreset, string> = {
  indigo: "bg-indigo-500/[0.06]",
  violet: "bg-violet-500/[0.06]",
  amber: "bg-amber-500/[0.07]",
  cyan: "bg-cyan-500/[0.06]",
  sky: "bg-sky-500/[0.06]",
  blue: "bg-blue-500/[0.06]",
};

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
