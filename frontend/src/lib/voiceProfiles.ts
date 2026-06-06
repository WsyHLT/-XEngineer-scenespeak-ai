export type VoiceProfile = {
  id: string;
  /** 火山 TTS voice_type — 传给 /api/chat/synthesize 的 voice_id */
  voiceId: string;
  emoji: string;
  label: string;
  subtitle: string;
};

/** 火山引擎英文/通用音色 — 见控制台「语音合成」音色列表 */
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "geek_uncle",
    voiceId: "BV407_streaming",
    emoji: "🌟",
    label: "极客大叔",
    subtitle: "Deep British Male",
  },
  {
    id: "gentle_senpai",
    voiceId: "BV700_streaming",
    emoji: "🎀",
    label: "治愈学姐",
    subtitle: "Gentle American Female",
  },
  {
    id: "ielts_examiner",
    voiceId: "BV406_streaming",
    emoji: "💼",
    label: "严格考官",
    subtitle: "Professional IELTS Examiner",
  },
  {
    id: "anime_friend",
    voiceId: "BV415_streaming",
    emoji: "🌸",
    label: "软萌萝莉",
    subtitle: "Casual Anime Friend",
  },
];

export function getVoiceById(id: string): VoiceProfile {
  return VOICE_PROFILES.find((v) => v.id === id) ?? VOICE_PROFILES[0];
}
