"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getVoiceById,
  VOICE_PROFILES,
  type VoiceProfile,
} from "@/lib/voiceProfiles";

const STORAGE_KEY = "scenespeak_voice_id";

export function useVoiceTimbre() {
  const [currentVoice, setCurrentVoiceState] = useState<VoiceProfile>(VOICE_PROFILES[0]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCurrentVoiceState(getVoiceById(stored));
  }, []);

  const setCurrentVoice = useCallback((voice: VoiceProfile) => {
    setCurrentVoiceState(voice);
    localStorage.setItem(STORAGE_KEY, voice.id);
  }, []);

  return {
    currentVoice,
    setCurrentVoice,
    voices: VOICE_PROFILES,
  };
}
