import type { Correction, CorrectionType, SessionReport } from "@/types/api";
import type {
  HistoryCorrection,
  HistoryRecord,
  HistoryReport,
  ReportDetailData,
  SkillScores,
} from "@/types/history";
import {
  HISTORY_MAX_ENTRIES,
  HISTORY_STORE_VERSION,
} from "@/types/history";
import { dispatchHistoryChanged } from "@/lib/historyEvents";
import { formatHistoryDisplayDate } from "@/lib/historyFormat";
import {
  MOCK_HISTORY,
  MOCK_HISTORY_REPORTS,
  shouldShowMockHistory,
} from "@/lib/mockHistoryData";
import { DRAFT_STORAGE_KEY, STORAGE_KEY } from "@/lib/storageKeys";
import { toastSuccess } from "@/components/ui/ToastProvider";

type StoredHistoryPayload = {
  version: number;
  records: HistoryRecord[];
  reports: Record<string, HistoryReport>;
};

type DraftPayload = {
  version: number;
  drafts: Record<string, HistoryReport>;
};

const CORRECTION_TYPE_TAG: Record<CorrectionType, string> = {
  grammar: "语法",
  expression: "表达",
  vocabulary: "词汇",
  pronunciation: "发音",
};

function extractWrongSpans(utterance: string, correction: Correction): string[] {
  const { original } = correction;
  if (!original.trim()) return [];
  if (utterance.toLowerCase().includes(original.toLowerCase())) {
    return [original];
  }
  return [original];
}

function countGrammarErrors(corrections: SessionReport["corrections"]): number {
  return corrections.filter((c) => c.correction.correction_type === "grammar").length;
}

function buildTags(report: SessionReport): string[] {
  const tags = new Set<string>();
  for (const item of report.corrections) {
    tags.add(CORRECTION_TYPE_TAG[item.correction.correction_type] ?? "表达");
  }
  if (report.total_turns > 0) {
    tags.add(`${report.total_turns} 轮对话`);
  }
  const grammarCount = countGrammarErrors(report.corrections);
  if (grammarCount > 0) {
    tags.add(`${grammarCount} 处语法`);
  }
  if (tags.size === 0) {
    tags.add("完成练习");
  }
  return [...tags].slice(0, 5);
}

function toHistoryCorrection(item: SessionReport["corrections"][number]): HistoryCorrection {
  const { correction, user_utterance } = item;
  return {
    youSaid: user_utterance,
    wrongSpans: extractWrongSpans(user_utterance, correction),
    aiCorrected: correction.corrected,
    betterAlternative: correction.explanation?.trim()
      ? correction.explanation
      : correction.corrected,
  };
}

function scoresToSkills(scores: SessionReport["scores"]): SkillScores {
  return {
    pronunciation: Math.round(scores.pronunciation),
    grammar: Math.round(scores.grammar),
    vocabulary: Math.round(scores.vocabulary),
    fluency: Math.round(scores.fluency),
    coherence: Math.round(scores.coherence ?? scores.fluency),
  };
}

export function sessionReportToHistoryReport(
  report: SessionReport,
  options?: { isDraft?: boolean },
): HistoryReport {
  const grammarErrorCount = countGrammarErrors(report.corrections);
  return {
    version: HISTORY_STORE_VERSION,
    id: report.session_id,
    sceneId: report.scene_id,
    scene: report.scene_name,
    score: Math.round(report.scores.overall),
    tags: buildTags(report),
    practicedAt: report.generated_at,
    totalTurns: report.total_turns,
    durationSeconds: report.duration_seconds,
    grammarErrorCount,
    isDraft: options?.isDraft,
    skills: scoresToSkills(report.scores),
    corrections: report.corrections.map(toHistoryCorrection),
    summary: report.summary,
    highlights: report.highlights,
    suggestions: report.suggestions,
  };
}

export function historyReportToDetail(report: HistoryReport): ReportDetailData {
  return {
    id: report.id,
    sceneName: report.scene,
    displayDate: formatHistoryDisplayDate(report.practicedAt),
    score: report.score,
    tags: report.tags,
    skills: report.skills,
    summary: report.summary,
    highlights: report.highlights,
    suggestions: report.suggestions,
    corrections: report.corrections,
    totalTurns: report.totalTurns,
    durationSeconds: report.durationSeconds,
    grammarErrorCount: report.grammarErrorCount,
    isDraft: report.isDraft,
  };
}

export function sessionReportToDetail(report: SessionReport): ReportDetailData {
  return historyReportToDetail(sessionReportToHistoryReport(report));
}

function emptyStore(): StoredHistoryPayload {
  return { version: HISTORY_STORE_VERSION, records: [], reports: {} };
}

function migrateLegacyRecord(raw: Record<string, unknown>): HistoryRecord | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const practicedAt =
    typeof raw.practicedAt === "string"
      ? raw.practicedAt
      : typeof raw.date === "string" && raw.date.includes("/")
        ? new Date().toISOString()
        : new Date().toISOString();

  return {
    version: HISTORY_STORE_VERSION,
    id,
    sceneId: (raw.sceneId as HistoryRecord["sceneId"]) ?? "casual_chat",
    scene: typeof raw.scene === "string" ? raw.scene : "练习",
    score: typeof raw.score === "number" ? raw.score : 0,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    practicedAt,
    totalTurns: typeof raw.totalTurns === "number" ? raw.totalTurns : 0,
    durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : 0,
    grammarErrorCount:
      typeof raw.grammarErrorCount === "number" ? raw.grammarErrorCount : 0,
    isDraft: raw.isDraft === true,
  };
}

function migrateLegacyReport(raw: Record<string, unknown>, record: HistoryRecord): HistoryReport {
  const skills = raw.skills as SkillScores | undefined;
  return {
    ...record,
    skills: skills ?? {
      pronunciation: record.score,
      grammar: record.score,
      vocabulary: record.score,
      fluency: record.score,
      coherence: record.score,
    },
    corrections: Array.isArray(raw.corrections) ? (raw.corrections as HistoryCorrection[]) : [],
    summary: typeof raw.summary === "string" ? raw.summary : "",
    highlights: Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [],
    suggestions: Array.isArray(raw.suggestions) ? (raw.suggestions as HistoryReport["suggestions"]) : [],
  };
}

function readStore(): StoredHistoryPayload {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StoredHistoryPayload & { records?: unknown[] };

    if (!Array.isArray(parsed.records)) return emptyStore();

    const records: HistoryRecord[] = [];
    const reports: Record<string, HistoryReport> = {};

    for (const item of parsed.records) {
      if (!item || typeof item !== "object") continue;
      const rec =
        "version" in item && (item as HistoryRecord).version === HISTORY_STORE_VERSION
          ? (item as HistoryRecord)
          : migrateLegacyRecord(item as Record<string, unknown>);
      if (!rec) continue;
      records.push(rec);
      const reportRaw = parsed.reports?.[rec.id];
      if (reportRaw && typeof reportRaw === "object") {
        reports[rec.id] =
          "version" in reportRaw
            ? (reportRaw as HistoryReport)
            : migrateLegacyReport(reportRaw as Record<string, unknown>, rec);
      }
    }

    return {
      version: HISTORY_STORE_VERSION,
      records,
      reports,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(payload: StoredHistoryPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function readDrafts(): DraftPayload {
  if (typeof window === "undefined") return { version: 1, drafts: {} };
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { version: 1, drafts: {} };
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed.drafts || typeof parsed.drafts !== "object") {
      return { version: 1, drafts: {} };
    }
    return parsed;
  } catch {
    return { version: 1, drafts: {} };
  }
}

function writeDrafts(payload: DraftPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

function upsertRecord(
  store: StoredHistoryPayload,
  historyReport: HistoryReport,
): StoredHistoryPayload {
  const record: HistoryRecord = {
    version: historyReport.version,
    id: historyReport.id,
    sceneId: historyReport.sceneId,
    scene: historyReport.scene,
    score: historyReport.score,
    tags: historyReport.tags,
    practicedAt: historyReport.practicedAt,
    totalTurns: historyReport.totalTurns,
    durationSeconds: historyReport.durationSeconds,
    grammarErrorCount: historyReport.grammarErrorCount,
    isDraft: historyReport.isDraft,
  };

  const records = [
    record,
    ...store.records.filter((r) => r.id !== record.id && !r.isDraft),
  ].slice(0, HISTORY_MAX_ENTRIES);

  const reports = { ...store.reports, [historyReport.id]: historyReport };
  const trimmedReports: Record<string, HistoryReport> = {};
  for (const r of records) {
    if (reports[r.id]) trimmedReports[r.id] = reports[r.id];
  }

  return { version: HISTORY_STORE_VERSION, records, reports: trimmedReports };
}

/** 仅返回用户真实记录（不含 Mock） */
export function getRealHistoryRecords(): HistoryRecord[] {
  return readStore().records.filter((r) => !r.isDraft);
}

export function getRealHistoryCount(): number {
  return getRealHistoryRecords().length;
}

export function hasRealHistory(): boolean {
  return getRealHistoryCount() > 0;
}

/** 加载时光回溯列表 — 有真实记录时绝不拼接 Mock */
export function loadHistoryRecords(): HistoryRecord[] {
  const real = getRealHistoryRecords();
  if (real.length > 0) return real;
  if (shouldShowMockHistory()) return MOCK_HISTORY;
  return [];
}

export function getStoredHistoryReport(id: string): HistoryReport | null {
  return readStore().reports[id] ?? null;
}

export function getHistoryReportById(id: string): HistoryReport | null {
  const stored = getStoredHistoryReport(id);
  if (stored) return stored;
  if (shouldShowMockHistory() && !hasRealHistory()) {
    return MOCK_HISTORY_REPORTS[id] ?? null;
  }
  return null;
}

/** 正式结束练习后写入时光回溯 */
export function savePracticeSession(
  report: SessionReport,
  options?: { silent?: boolean },
): HistoryReport {
  const historyReport = sessionReportToHistoryReport(report, { isDraft: false });
  const store = upsertRecord(readStore(), historyReport);
  writeStore(store);

  const drafts = readDrafts();
  if (drafts.drafts[report.session_id]) {
    delete drafts.drafts[report.session_id];
    writeDrafts(drafts);
  }

  dispatchHistoryChanged({ source: "save" });
  if (!options?.silent) {
    toastSuccess("本次练习已保存至时光回溯");
  }
  return historyReport;
}

/** 每 N 轮静默草稿保存 */
export function savePracticeDraft(report: SessionReport): void {
  if (report.total_turns < 1) return;
  const historyReport = sessionReportToHistoryReport(report, { isDraft: true });
  const drafts = readDrafts();
  drafts.drafts[report.session_id] = historyReport;
  writeDrafts(drafts);
  dispatchHistoryChanged({ source: "draft" });
}

export function deleteHistoryRecord(id: string): void {
  const store = readStore();
  const records = store.records.filter((r) => r.id !== id);
  const reports = { ...store.reports };
  delete reports[id];
  writeStore({ version: HISTORY_STORE_VERSION, records, reports });
  dispatchHistoryChanged({ source: "delete" });
}

export function clearPracticeHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  dispatchHistoryChanged({ source: "clear" });
}

export { STORAGE_KEY, DRAFT_STORAGE_KEY };
