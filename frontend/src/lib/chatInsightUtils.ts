import type { Correction } from "@/types/api";
import type { ChatInsight } from "@/types/chat";

/** 将后端 Correction 映射为 UI ChatInsight */
export function correctionToInsight(correction: Correction): ChatInsight {
  const isGrammar = correction.correction_type === "grammar";
  const isExpression =
    correction.correction_type === "expression" ||
    correction.correction_type === "vocabulary";

  return {
    grammarFix: isGrammar
      ? { original: correction.original, corrected: correction.corrected }
      : undefined,
    betterAlternative: isExpression ? correction.corrected : undefined,
    explanation: correction.explanation || undefined,
  };
}

/** 合并 correction 与显式 insight，供气泡渲染 */
export function resolveChatInsight(item: {
  insight?: ChatInsight;
  correction?: Correction;
}): ChatInsight | undefined {
  if (item.insight) return item.insight;
  if (item.correction) return correctionToInsight(item.correction);
  return undefined;
}
