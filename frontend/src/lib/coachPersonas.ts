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
      "I'm allergic to…",
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
      "My main focus this sprint is…",
      "I'm blocked on…",
      "Does anyone have concerns about the deadline?",
    ],
  },
  casual_chat: {
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
    glowRgb: "56, 189, 248",
    roleTitle: "Friend Jamie",
    tagline: "Zero pressure · daily small talk",
    hints: [
      "Honestly, I've been really into…",
      "That reminds me of…",
      "What about you — anything fun planned?",
    ],
  },
  travel: {
    gradient: "from-teal-400 via-cyan-500 to-blue-600",
    glowRgb: "45, 212, 191",
    roleTitle: "Officer Rivera",
    tagline: "Customs · immigration · travel English",
    hints: [
      "I'm here for tourism for two weeks.",
      "I'm staying at a hotel near the city center.",
      "No, I don't have anything to declare.",
    ],
  },
  ielts: {
    gradient: "from-indigo-500 via-violet-600 to-purple-700",
    glowRgb: "99, 102, 241",
    roleTitle: "Examiner Dr. Patel",
    tagline: "IELTS speaking · timed practice",
    hints: [
      "Well, I would say that…",
      "One example that comes to mind is…",
      "On the one hand… on the other hand…",
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
