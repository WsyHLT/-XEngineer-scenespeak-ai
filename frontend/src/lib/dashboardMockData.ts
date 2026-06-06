/** Dashboard 模拟数据 — 后续可替换为 API 响应 */

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type AccentMode = "us" | "uk" | "exam";

export type SkillScores = {
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  coherence: number;
};

export type PracticeHistoryItem = {
  id: string;
  date: string;
  scene: string;
  sceneId: string;
  score: number;
};

export const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "beginner", label: "初级 Beginner" },
  { value: "intermediate", label: "中级 Intermediate" },
  { value: "advanced", label: "高级 Advanced" },
];

export const ACCENT_OPTIONS: { value: AccentMode; label: string }[] = [
  { value: "us", label: "美式英语 US" },
  { value: "uk", label: "英式英语 UK" },
  { value: "exam", label: "雅思/托福考官模式" },
];

export const MOCK_USER_STATS = {
  displayName: "Learner",
  dailyMinutes: 5,
  dailyGoalMinutes: 20,
  streakDays: 5,
  skills: {
    pronunciation: 72,
    grammar: 85,
    vocabulary: 68,
    fluency: 74,
    coherence: 80,
  } satisfies SkillScores,
};

export const MOCK_PRACTICE_HISTORY: PracticeHistoryItem[] = [
  { id: "1", date: "2026-06-05", scene: "面试", sceneId: "interview", score: 86 },
  { id: "2", date: "2026-06-04", scene: "点餐", sceneId: "ordering", score: 78 },
  { id: "3", date: "2026-06-03", scene: "会议", sceneId: "meeting", score: 91 },
  { id: "4", date: "2026-06-02", scene: "面试", sceneId: "interview", score: 74 },
  { id: "5", date: "2026-06-01", scene: "点餐", sceneId: "ordering", score: 82 },
];

export const MOCK_DAILY_EXPRESSION = {
  text: "I look forward to the opportunity to contribute my skills to your team.",
  hint: "在接下来的练习中尝试使用该句型可获得额外评分奖励",
};
