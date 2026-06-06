/** 与 backend/app/schemas 保持同步的前端类型定义 */

export type SceneId = "interview" | "ordering" | "meeting";

export type MessageRole = "user" | "assistant" | "system";

export type CorrectionType =
  | "grammar"
  | "expression"
  | "pronunciation"
  | "vocabulary";

export type CorrectionSeverity = "minor" | "moderate" | "major";

export type SessionStatus = "active" | "ended" | "report_ready";

export type WSEventType =
  | "audio_chunk"
  | "audio_end"
  | "text_input"
  | "ping"
  | "transcript"
  | "assistant_delta"
  | "assistant_message"
  | "assistant_audio"
  | "correction"
  | "error"
  | "pong"
  | "session_ended";

export interface Scene {
  id: SceneId;
  name: string;
  name_zh: string;
  description: string;
  system_prompt: string;
  icon?: string | null;
}

export interface WordPronunciationFeedback {
  word: string;
  accuracy_score: number;
  phoneme?: string | null;
  error_type?: string | null;
}

export interface PronunciationAssessment {
  accuracy: number;
  fluency: number;
  completeness: number;
  overall: number;
  prosody?: number | null;
  words: WordPronunciationFeedback[];
  corrections: Correction[];
}

export interface TranscribeResponse {
  text: string;
  asr_engine: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  correction_type: CorrectionType;
  severity: CorrectionSeverity;
}

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  audio_url?: string | null;
  correction?: Correction | null;
  pronunciation_score?: number | null;
  created_at: string;
}

export interface ScoreBreakdown {
  pronunciation: number;
  grammar: number;
  fluency: number;
  vocabulary: number;
  overall: number;
}

export interface CorrectionRecord {
  message_id: string;
  turn_index: number;
  user_utterance: string;
  correction: Correction;
}

export interface ImprovementSuggestion {
  area: string;
  current_score: number;
  target_score: number;
  suggestion: string;
  priority: number;
}

export interface SessionReport {
  session_id: string;
  scene_id: SceneId;
  scene_name: string;
  scores: ScoreBreakdown;
  corrections: CorrectionRecord[];
  suggestions: ImprovementSuggestion[];
  summary: string;
  highlights: string[];
  total_turns: number;
  duration_seconds: number;
  generated_at: string;
}

export interface SceneListResponse {
  scenes: Scene[];
}

export interface SessionStartRequest {
  scene_id: SceneId;
}

export interface SessionStartResponse {
  session_id: string;
  scene: Scene;
  status: SessionStatus;
  started_at: string;
  websocket_url: string;
}

export interface MessageListResponse {
  session_id: string;
  messages: Message[];
  total: number;
}

/** SSE / WebSocket 服务端事件 */
export type TurnEventKind =
  | "user_message"
  | "assistant_delta"
  | "assistant_done"
  | "correction";

export interface TurnEventPayload {
  kind: TurnEventKind;
  session_id: string;
  message_id: string;
  delta?: string;
  message?: Message;
  correction?: Correction;
}

export type WSServerEvent =
  | { type: "transcript"; session_id: string; text: string; is_final: boolean; message_id?: string | null }
  | { type: "assistant_delta"; session_id: string; message_id: string; delta: string }
  | { type: "correction"; session_id: string; message_id: string; correction: Correction; pronunciation_score?: number | null }
  | { type: "assistant_message"; session_id: string; message: Message }
  | { type: "assistant_audio"; session_id: string; message_id: string; audio_url?: string | null; audio_base64?: string | null }
  | { type: "session_ended"; session_id: string; reason: string }
  | { type: "error"; session_id?: string | null; code: string; message: string }
  | { type: "pong" };
