import type {
  HistoryRecord,
  HistoryReport,
  SkillScores,
} from "@/types/history";
import { HISTORY_STORE_VERSION } from "@/types/history";
import type { SceneId } from "@/types/api";
import {
  getRealHistoryRecords,
  getStoredHistoryReport,
} from "@/lib/practiceHistoryStore";

const DEFAULT_SKILLS: SkillScores = {
  pronunciation: 70,
  grammar: 70,
  vocabulary: 70,
  fluency: 70,
  coherence: 70,
};

function averageSkills(reports: HistoryReport[]): SkillScores {
  if (reports.length === 0) return DEFAULT_SKILLS;
  const sum: SkillScores = {
    pronunciation: 0,
    grammar: 0,
    vocabulary: 0,
    fluency: 0,
    coherence: 0,
  };
  for (const r of reports) {
    sum.pronunciation += r.skills.pronunciation;
    sum.grammar += r.skills.grammar;
    sum.vocabulary += r.skills.vocabulary;
    sum.fluency += r.skills.fluency;
    sum.coherence += r.skills.coherence;
  }
  const n = reports.length;
  return {
    pronunciation: Math.round(sum.pronunciation / n),
    grammar: Math.round(sum.grammar / n),
    vocabulary: Math.round(sum.vocabulary / n),
    fluency: Math.round(sum.fluency / n),
    coherence: Math.round(sum.coherence / n),
  };
}

/** 近 7 次正式练习报告的五维均值 — 供主页雷达图 */
export function computeRecentSkillAverage(windowSize = 7): SkillScores {
  const records = getRealHistoryRecords().filter((r) => !r.isDraft);
  const recent = records.slice(0, windowSize);
  const reports: HistoryReport[] = [];
  for (const rec of recent) {
    const report = getStoredHistoryReport(rec.id);
    if (report) reports.push(report);
  }
  return averageSkills(reports);
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 近 7 天连续打卡天数（有练习记录即算打卡） */
export function computeStreakDays(windowDays = 7): number {
  const records = getRealHistoryRecords().filter((r) => !r.isDraft);
  if (records.length === 0) return 0;

  const practicedDays = new Set(records.map((r) => dayKey(r.practicedAt)));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (practicedDays.has(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export type ProficiencyQuestData = {
  level: {
    code: string;
    label: string;
    nextLevel: string;
    currentXp: number;
    targetXp: number;
  };
  daily: {
    phrase: string;
    meaningZh: string;
    bonusScene: string;
    tip: string;
  };
  stats: {
    sessionsLast7Days: number;
    totalMinutesLast7Days: number;
  };
};

const DAILY_PHRASES = [
  {
    phrase: "Hit the nail on the head",
    meaningZh: "意为「一针见血 / 说得中肯」",
    bonusScene: "跨国会议",
  },
  {
    phrase: "Break the ice",
    meaningZh: "意为「打破僵局 / 活跃气氛」",
    bonusScene: "自由闲聊",
  },
  {
    phrase: "On the same page",
    meaningZh: "意为「达成共识 / 理解一致」",
    bonusScene: "跨国会议",
  },
];

function levelFromSessions(count: number): ProficiencyQuestData["level"] {
  if (count >= 14) {
    return { code: "C1", label: "Advanced", nextLevel: "C2", currentXp: 2450 + count * 20, targetXp: 3000 };
  }
  if (count >= 7) {
    return { code: "B2", label: "Upper-Intermediate", nextLevel: "C1", currentXp: 1200 + count * 30, targetXp: 2000 };
  }
  if (count >= 3) {
    return { code: "B1", label: "Intermediate", nextLevel: "B2", currentXp: 400 + count * 50, targetXp: 1000 };
  }
  return { code: "A2", label: "Elementary", nextLevel: "B1", currentXp: count * 80, targetXp: 500 };
}

/** 基于近 7 天真实练习数据驱动每日任务卡片 */
export function computeProficiencyQuest(): ProficiencyQuestData {
  const records = getRealHistoryRecords().filter((r) => !r.isDraft);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => new Date(r.practicedAt).getTime() >= cutoff);

  const totalSeconds = recent.reduce((s, r) => s + r.durationSeconds, 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const dayIndex = new Date().getDate() % DAILY_PHRASES.length;
  const daily = DAILY_PHRASES[dayIndex]!;

  return {
    level: levelFromSessions(recent.length),
    daily: {
      ...daily,
      tip:
        recent.length > 0
          ? `💡 近 7 天已练 ${recent.length} 次 · 共 ${totalMinutes} 分钟。今日在【${daily.bonusScene}】使用该表达可加速晋级！`
          : `💡 完成首次练习后，段位与 XP 将根据真实数据自动更新。`,
    },
    stats: {
      sessionsLast7Days: recent.length,
      totalMinutesLast7Days: totalMinutes,
    },
  };
}

export type HistorySceneFilter = SceneId | "all";

export function filterHistoryByScene(
  records: HistoryRecord[],
  sceneId: HistorySceneFilter,
): HistoryRecord[] {
  if (sceneId === "all") return records;
  return records.filter((r) => r.sceneId === sceneId);
}

export function isNearHistoryLimit(count: number, max = 50, warnAt = 45): boolean {
  return count >= warnAt && count < max;
}

export function isAtHistoryLimit(count: number, max = 50): boolean {
  return count >= max;
}
