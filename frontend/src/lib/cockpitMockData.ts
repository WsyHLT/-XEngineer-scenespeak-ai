import type { SceneId } from "@/types/api";
import type { TintPreset } from "@/lib/designSystem";
import type { SkillScores } from "@/types/history";

export type { SkillScores };

export type SceneCategory = "all" | "work" | "life" | "exam";

export type CockpitScenario = {
  id: string;
  backendSceneId: SceneId;
  category: Exclude<SceneCategory, "all">;
  name_zh: string;
  name: string;
  description: string;
  icon: string;
  /** 卡片角落氛围渐变（仅装饰层） */
  gradient: string;
  /** 主题色边框：默认 + hover（减噪后可留空） */
  borderClass: string;
  /** hover 卡片下沉阴影 */
  hoverGlow: string;
  /** 图标容器 */
  iconClass: string;
  /** 底部胶囊按钮 */
  buttonClass: string;
  /** 副标题（英文名）— 卡片色调混色 */
  subtitleClass: string;
  /** 描述正文 — 卡片色调混色 */
  descClass: string;
  /** 色彩提取蒙版/ hover 融合主色 */
  tintPreset: TintPreset;
};

export const MOCK_SKILLS: SkillScores = {
  pronunciation: 72,
  grammar: 85,
  vocabulary: 68,
  fluency: 74,
  coherence: 80,
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
    backendSceneId: "casual_chat",
    category: "life",
    name_zh: "自由闲聊",
    name: "Casual Chat · Virtual Friend",
    description: "零压力日常闲聊，吐槽追剧、聊八卦、倾诉心事，像朋友一样瞎聊。",
    icon: "💬",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-sky-500/12",
    buttonClass:
      "bg-sky-500/12 text-sky-200/90 hover:bg-sky-500/20 hover:text-sky-100",
    subtitleClass: "text-blue-300/60",
    descClass: "text-indigo-200/55",
    tintPreset: "sky",
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
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-violet-500/12",
    buttonClass:
      "bg-violet-500/12 text-violet-200/90 hover:bg-violet-500/20 hover:text-violet-100",
    subtitleClass: "text-indigo-300/60",
    descClass: "text-indigo-200/55",
    tintPreset: "violet",
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
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-amber-500/12",
    buttonClass:
      "bg-amber-500/12 text-amber-200/90 hover:bg-amber-500/20 hover:text-amber-100",
    subtitleClass: "text-amber-300/55",
    descClass: "text-amber-200/50",
    tintPreset: "amber",
  },
  {
    id: "airport",
    backendSceneId: "travel",
    category: "life",
    name_zh: "环球旅行",
    name: "Airport Customs",
    description: "模拟出境海关问询、行李托运、改签机票等高频紧张场景。",
    icon: "✈️",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-indigo-500/12",
    buttonClass:
      "bg-indigo-500/12 text-indigo-200/90 hover:bg-indigo-500/20 hover:text-indigo-100",
    subtitleClass: "text-indigo-300/60",
    descClass: "text-indigo-200/55",
    tintPreset: "cyan",
  },
  {
    id: "ielts",
    backendSceneId: "ielts",
    category: "exam",
    name_zh: "学术冲刺",
    name: "IELTS / TOEFL Speaking",
    description: "1:1 还原官方真题，严苛时间限制下的高强度思辨表达。",
    icon: "🎓",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-indigo-500/12",
    buttonClass:
      "bg-indigo-500/12 text-indigo-200/90 hover:bg-indigo-500/20 hover:text-indigo-100",
    subtitleClass: "text-blue-300/60",
    descClass: "text-indigo-200/55",
    tintPreset: "indigo",
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
    borderClass: "",
    hoverGlow: "hover:shadow-depth-hover hover:-translate-y-0.5",
    iconClass: "bg-blue-500/12",
    buttonClass:
      "bg-blue-500/12 text-blue-200/90 hover:bg-blue-500/20 hover:text-blue-100",
    subtitleClass: "text-blue-300/60",
    descClass: "text-indigo-200/55",
    tintPreset: "blue",
  },
];

export type ProficiencyLevel = {
  code: string;
  label: string;
  nextLevel: string;
  currentXp: number;
  targetXp: number;
};

export type DailyExpressQuest = {
  phrase: string;
  meaningZh: string;
  bonusScene: string;
  tip: string;
};

export type ProficiencyQuestData = {
  level: ProficiencyLevel;
  daily: DailyExpressQuest;
};

export const MOCK_PROFICIENCY_QUEST: ProficiencyQuestData = {
  level: {
    code: "C1",
    label: "Advanced",
    nextLevel: "C2",
    currentXp: 2450,
    targetXp: 3000,
  },
  daily: {
    phrase: "Hit the nail on the head",
    meaningZh: "意为「一针见血 / 说得中肯」",
    bonusScene: "跨国会议",
    tip: "💡 今日在【跨国会议】场景中使用该词，可触发双倍 XP 奖励！",
  },
};

/** 历史记录场景名 → 色彩提取蒙版 */
export const SCENE_TINT_BY_NAME: Record<string, TintPreset> = {
  职场通关: "violet",
  生存口语: "amber",
  环球旅行: "cyan",
  学术冲刺: "indigo",
  自由闲聊: "sky",
  跨国会议: "blue",
};

export function getSceneTint(sceneName: string): TintPreset {
  return SCENE_TINT_BY_NAME[sceneName] ?? "indigo";
}

export function pickBlindBoxScenario(): CockpitScenario {
  const pool = SCENARIO_MATRIX.filter(
    (s) => s.category === "life" || s.id === "casual_chat",
  );
  return pool[Math.floor(Math.random() * pool.length)] ?? SCENARIO_MATRIX[0];
}
