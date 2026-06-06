import type { Scene, SceneId } from "@/types/api";

export type CoachPersona = {
  gradient: string;
  glowRgb: string;
  roleTitle: string;
  tagline: string;
  hints: string[];
};

const PERSONAS: Record<SceneId, CoachPersona> = {
  interview: {
    gradient: "from-violet-600 via-purple-600 to-indigo-800",
    glowRgb: "139, 92, 246",
    roleTitle: "HR Director Sarah",
    tagline: "Pressure interview · STAR method",
    hints: [
      "I'm not entirely sure, but…",
      "Could you please elaborate on…",
      "My background aligns well with this role because…",
    ],
  },
  ordering: {
    gradient: "from-amber-500 via-orange-500 to-yellow-600",
    glowRgb: "251, 191, 36",
    roleTitle: "Server Alex",
    tagline: "Noisy café · survival English",
    hints: [
      "I'm not entirely sure, but…",
      "Could I get the check, please?",
      "Actually, could we change my order to…",
    ],
  },
  meeting: {
    gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    glowRgb: "56, 189, 248",
    roleTitle: "Team Lead Morgan",
    tagline: "Global stand-up · async sync",
    hints: [
      "I'm not entirely sure, but…",
      "Could you please elaborate on…",
      "Does anyone have concerns about the deadline?",
    ],
  },
};

export function getCoachPersona(scene: Scene): CoachPersona {
  const base = PERSONAS[scene.id] ?? PERSONAS.meeting;
  return {
    ...base,
    roleTitle: scene.name_zh ? `${scene.icon ?? "🤖"} ${scene.name_zh}` : base.roleTitle,
  };
}

export type CoachSessionState =
  | "idle"
  | "ai_speaking"
  | "ai_thinking"
  | "listening"
  | "user_speaking"
  | "transcribing"
  | "reviewing";

export const STATE_LABELS: Record<CoachSessionState, string> = {
  idle: "Standby",
  ai_speaking: "Speaking",
  ai_thinking: "Thinking",
  listening: "Listening",
  user_speaking: "You're speaking",
  transcribing: "Transcribing",
  reviewing: "Review transcript",
};
