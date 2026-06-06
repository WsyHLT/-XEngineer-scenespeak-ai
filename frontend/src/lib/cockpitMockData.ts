import type { SceneId } from "@/types/api";

export type SceneCategory = "all" | "work" | "life" | "exam";

export type CockpitScenario = {
  id: string;
  backendSceneId: SceneId;
  category: Exclude<SceneCategory, "all">;
  name_zh: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  glowClass: string;
  accent: string;
};

export type SkillScores = {
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  coherence: number;
};

export type HistoryRecord = {
  id: string;
  date: string;
  scene: string;
  score: number;
  tags: string[];
};

export const CATEGORY_TABS: { id: SceneCategory; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "work", label: "职场" },
  { id: "life", label: "生活" },
  { id: "exam", label: "备考" },
];

/** 场景矩阵 — 增减场景只需编辑此数组 */
export const SCENARIO_MATRIX: CockpitScenario[] = [
  {
    id: "casual_chat",
    backendSceneId: "meeting",
    category: "life",
    name_zh: "自由闲聊",
    name: "Casual Chat · Virtual Friend",
    description: "零压力日常闲聊，吐槽追剧、聊八卦、倾诉心事，像朋友一样瞎聊。",
    icon: "💬",
    gradient: "from-rose-400 via-orange-400 to-amber-400",
    glowClass: "shadow-neon-pink",
    accent: "group-hover:shadow-neon-pink",
  },
  {
    id: "interview",
    backendSceneId: "interview",
    category: "work",
    name_zh: "职场通关",
    name: "Job Interview",
    description: "模拟全英文压力面试，针对简历细节与项目经验进行尖锐追问。",
    icon: "💼",
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    glowClass: "shadow-neon",
    accent: "group-hover:shadow-neon",
  },
  {
    id: "ordering",
    backendSceneId: "ordering",
    category: "life",
    name_zh: "生存口语",
    name: "Restaurant Ordering",
    description: "真实模拟嘈杂餐厅，应对售罄、忌口、过敏等突发状况。",
    icon: "🍔",
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    glowClass: "shadow-[0_0_30px_rgba(251,191,36,0.35)]",
    accent: "group-hover:shadow-[0_0_30px_rgba(251,191,36,0.45)]",
  },
  {
    id: "airport",
    backendSceneId: "ordering",
    category: "life",
    name_zh: "环球旅行",
    name: "Airport Customs",
    description: "模拟出境海关问询、行李托运、改签机票等高频紧张场景。",
    icon: "✈️",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    glowClass: "shadow-[0_0_30px_rgba(45,212,191,0.35)]",
    accent: "group-hover:shadow-[0_0_30px_rgba(45,212,191,0.45)]",
  },
  {
    id: "ielts",
    backendSceneId: "interview",
    category: "exam",
    name_zh: "学术冲刺",
    name: "IELTS / TOEFL Speaking",
    description: "1:1 还原官方真题，严苛时间限制下的高强度思辨表达。",
    icon: "🎓",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    glowClass: "shadow-[0_0_30px_rgba(56,189,248,0.35)]",
    accent: "group-hover:shadow-[0_0_30px_rgba(56,189,248,0.45)]",
  },
  {
    id: "meeting",
    backendSceneId: "meeting",
    category: "work",
    name_zh: "跨国会议",
    name: "Global Team Meeting",
    description: "英文站会、项目汇报与跨部门协作，练专业表达与临场反应。",
    icon: "🤝",
    gradient: "from-cyan-500 via-blue-600 to-violet-600",
    glowClass: "shadow-neon",
    accent: "group-hover:shadow-neon",
  },
];

export const MOCK_SKILLS: SkillScores = {
  pronunciation: 72,
  grammar: 85,
  vocabulary: 68,
  fluency: 74,
  coherence: 80,
};

export const MOCK_HISTORY: HistoryRecord[] = [
  {
    id: "1",
    date: "06/05",
    scene: "职场通关",
    score: 86,
    tags: ["时态", "连读"],
  },
  {
    id: "2",
    date: "06/04",
    scene: "生存口语",
    score: 78,
    tags: ["词汇"],
  },
  {
    id: "3",
    date: "06/03",
    scene: "学术冲刺",
    score: 91,
    tags: ["逻辑"],
  },
  {
    id: "4",
    date: "06/02",
    scene: "自由闲聊",
    score: 74,
    tags: ["发音", "流畅度"],
  },
];

export function pickBlindBoxScenario(): CockpitScenario {
  const pool = SCENARIO_MATRIX.filter(
    (s) => s.category === "life" || s.id === "casual_chat",
  );
  return pool[Math.floor(Math.random() * pool.length)] ?? SCENARIO_MATRIX[0];
}
