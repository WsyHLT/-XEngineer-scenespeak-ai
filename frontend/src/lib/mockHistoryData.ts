import type { HistoryRecord, HistoryReport } from "@/types/history";
import { HISTORY_STORE_VERSION } from "@/types/history";

/** 仅开发演示环境、且用户无任何真实记录时使用 */
export const MOCK_HISTORY: HistoryRecord[] = [
  {
    version: HISTORY_STORE_VERSION,
    id: "mock-1",
    sceneId: "interview",
    scene: "职场通关",
    score: 86,
    tags: ["时态", "连读"],
    practicedAt: "2026-06-05T10:30:00.000Z",
    totalTurns: 8,
    durationSeconds: 323,
    grammarErrorCount: 2,
  },
  {
    version: HISTORY_STORE_VERSION,
    id: "mock-2",
    sceneId: "ordering",
    scene: "生存口语",
    score: 78,
    tags: ["词汇"],
    practicedAt: "2026-06-04T14:15:00.000Z",
    totalTurns: 6,
    durationSeconds: 245,
    grammarErrorCount: 2,
  },
  {
    version: HISTORY_STORE_VERSION,
    id: "mock-3",
    sceneId: "ielts",
    scene: "学术冲刺",
    score: 91,
    tags: ["逻辑"],
    practicedAt: "2026-06-03T09:00:00.000Z",
    totalTurns: 10,
    durationSeconds: 480,
    grammarErrorCount: 1,
  },
  {
    version: HISTORY_STORE_VERSION,
    id: "mock-4",
    sceneId: "casual_chat",
    scene: "自由闲聊",
    score: 74,
    tags: ["发音", "流畅度"],
    practicedAt: "2026-06-02T20:45:00.000Z",
    totalTurns: 5,
    durationSeconds: 198,
    grammarErrorCount: 2,
  },
];

export const MOCK_HISTORY_REPORTS: Record<string, HistoryReport> = {
  "mock-1": {
    ...MOCK_HISTORY[0],
    skills: {
      pronunciation: 82,
      grammar: 78,
      vocabulary: 88,
      fluency: 85,
      coherence: 90,
    },
    summary: "面试场景表达整体流畅，时态与主谓一致需加强。",
    highlights: ["回答结构清晰", "专业词汇运用得当"],
    suggestions: [],
    corrections: [
      {
        youSaid: "I have went to the stand-up meeting yesterday.",
        wrongSpans: ["have went"],
        aiCorrected: "I went to the stand-up meeting yesterday.",
        betterAlternative: "I attended yesterday's stand-up and shared my sprint update.",
      },
    ],
  },
  "mock-2": {
    ...MOCK_HISTORY[1],
    skills: {
      pronunciation: 75,
      grammar: 80,
      vocabulary: 72,
      fluency: 78,
      coherence: 82,
    },
    summary: "餐厅场景基本完成任务，注意可数名词复数形式。",
    highlights: ["敢于开口点单"],
    suggestions: [],
    corrections: [
      {
        youSaid: "Can I get a table for two peoples?",
        wrongSpans: ["peoples"],
        aiCorrected: "Can I get a table for two people?",
        betterAlternative: "Could we have a table for two, please?",
      },
    ],
  },
  "mock-3": {
    ...MOCK_HISTORY[2],
    skills: {
      pronunciation: 90,
      grammar: 92,
      vocabulary: 88,
      fluency: 91,
      coherence: 94,
    },
    summary: "雅思话题回答逻辑连贯，论证有深度。",
    highlights: ["观点展开充分"],
    suggestions: [],
    corrections: [
      {
        youSaid: "Technology make our life more convenient.",
        wrongSpans: ["make"],
        aiCorrected: "Technology makes our lives more convenient.",
        betterAlternative: "Technology has fundamentally reshaped how we live and communicate.",
      },
    ],
  },
  "mock-4": {
    ...MOCK_HISTORY[3],
    skills: {
      pronunciation: 68,
      grammar: 76,
      vocabulary: 70,
      fluency: 72,
      coherence: 78,
    },
    summary: "闲聊场景参与度不错，注意副词与动词搭配。",
    highlights: ["表达自然"],
    suggestions: [],
    corrections: [
      {
        youSaid: "I very like this movie, it is so amazing.",
        wrongSpans: ["very like"],
        aiCorrected: "I really like this movie — it's amazing.",
        betterAlternative: "I'm totally hooked on this film; the pacing is incredible.",
      },
    ],
  },
};

export function shouldShowMockHistory(): boolean {
  return process.env.NODE_ENV === "development";
}
