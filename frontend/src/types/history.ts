import type { ImprovementSuggestion, SceneId } from "@/types/api";

/** 五维口语能力指标 — 全部来自后端报告或历史聚合，禁止前端拼凑 */
export type SkillScores = {
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  coherence: number;
};

export type HistoryCorrection = {
  youSaid: string;
  wrongSpans: string[];
  aiCorrected: string;
  betterAlternative: string;
};

/** 时光回溯列表项 — practicedAt 为 ISO 8601 */
export type HistoryRecord = {
  version: number;
  id: string;
  sceneId: SceneId;
  scene: string;
  score: number;
  tags: string[];
  practicedAt: string;
  totalTurns: number;
  durationSeconds: number;
  grammarErrorCount: number;
  isDraft?: boolean;
};

export type HistoryReport = HistoryRecord & {
  skills: SkillScores;
  corrections: HistoryCorrection[];
  summary: string;
  highlights: string[];
  suggestions: ImprovementSuggestion[];
};

/** 统一报告弹窗视图模型 — SessionReport / HistoryReport 均转换为此结构 */
export type ReportDetailData = {
  id: string;
  sceneName: string;
  displayDate: string;
  score: number;
  tags: string[];
  skills: SkillScores;
  summary: string;
  highlights: string[];
  suggestions: ImprovementSuggestion[];
  corrections: HistoryCorrection[];
  totalTurns: number;
  durationSeconds: number;
  grammarErrorCount: number;
  isDraft?: boolean;
};

export const HISTORY_STORE_VERSION = 2;
export const HISTORY_MAX_ENTRIES = 50;
export const HISTORY_WARN_THRESHOLD = 45;
export const DRAFT_AUTOSAVE_TURN_INTERVAL = 2;
