"use client";

import { useMemo } from "react";

/** AI 虚拟人三态 — 可直接绑定 TTS / LLM 流 */
export type AiStatus = "listening" | "thinking" | "speaking";

export type CoachSessionUIInput = {
  /** 用户正在录音 / 开口 */
  isUserSpeaking: boolean;
  /** TTS 朗读中 */
  isAiSpeaking: boolean;
  /** LLM 推理 / 流式生成 / ASR 识别中 */
  isAiThinking: boolean;
  /** 场景化求助提示词（3 条为佳） */
  hints: string[];
};

export type CoachSessionUIState = {
  aiStatus: AiStatus;
  isUserSpeaking: boolean;
  hints: string[];
};

const AI_STATUS_LABEL: Record<AiStatus, string> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

export function deriveAiStatus(input: {
  isAiSpeaking: boolean;
  isAiThinking: boolean;
}): AiStatus {
  if (input.isAiSpeaking) return "speaking";
  if (input.isAiThinking) return "thinking";
  return "listening";
}

/**
 * 口语会话 UI 状态 Hook — 预留 ASR / TTS / LLM 绑定接口
 *
 * @example
 * const { aiStatus, isUserSpeaking, hints } = useCoachSessionUI({
 *   isUserSpeaking: recorder.isRecording,
 *   isAiSpeaking: tts.isSpeaking,
 *   isAiThinking: isProcessing || !!streamingId || isTranscribing,
 *   hints: persona.hints,
 * });
 */
export function useCoachSessionUI(input: CoachSessionUIInput): CoachSessionUIState {
  const { isUserSpeaking, isAiSpeaking, isAiThinking, hints } = input;

  const aiStatus = useMemo(
    () => deriveAiStatus({ isAiSpeaking, isAiThinking }),
    [isAiSpeaking, isAiThinking],
  );

  return useMemo(
    () => ({
      aiStatus,
      isUserSpeaking,
      hints,
    }),
    [aiStatus, isUserSpeaking, hints],
  );
}

export { AI_STATUS_LABEL };
