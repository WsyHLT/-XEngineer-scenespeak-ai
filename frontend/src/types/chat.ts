import type { Correction, PronunciationAssessment } from "@/types/api";

/** 智能纠错浮窗数据结构 — 可含语法修正 + 高级表达推荐 */
export type ChatInsight = {
  grammarFix?: {
    original: string;
    corrected: string;
  };
  betterAlternative?: string;
  explanation?: string;
};

export type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  correction?: Correction;
  /** 优先于 correction 渲染 Floating Insight */
  insight?: ChatInsight;
  /** AI 消息中文翻译 */
  translationZh?: string;
  pronunciation?: PronunciationAssessment;
};
