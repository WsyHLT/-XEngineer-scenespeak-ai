"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "@/lib/api";

export type UseTextToSpeechReturn = {
  enabled: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  setEnabled: (on: boolean) => void;
  toggleEnabled: () => void;
  speak: (text: string) => void;
  stop: () => void;
};

/** 火山 TTS 超过此时间未返回则先用浏览器朗读，避免长时间静默 */
const BROWSER_PREEMPT_MS = 4_500;
const VOLCANO_FETCH_MS = 8_000;

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return (
    en.find((v) => v.lang.toLowerCase() === "en-us" && v.localService) ??
    en.find((v) => v.lang.toLowerCase() === "en-us") ??
    en.find((v) => v.localService) ??
    en[0]
  );
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [enabled, setEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speakGenRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const refreshVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickEnglishVoice(voices);
    };

    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    speakGenRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setIsSpeaking(false);
  }, [cleanupAudio]);

  const speakWithBrowser = useCallback((trimmed: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    if (voiceRef.current) utterance.voice = voiceRef.current;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const playVolcanoBlob = useCallback(
    async (blob: Blob, gen: number) => {
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => {
        if (gen === speakGenRef.current) setIsSpeaking(true);
      };
      audio.onended = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          cleanupAudio();
        }
      };
      audio.onerror = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          cleanupAudio();
        }
      };

      await audio.play();
    },
    [cleanupAudio],
  );

  const speak = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!enabled || !trimmed) return;

      stop();
      const gen = speakGenRef.current;
      let browserStarted = false;

      const startBrowserIfNeeded = () => {
        if (browserStarted || gen !== speakGenRef.current) return;
        browserStarted = true;
        speakWithBrowser(trimmed);
      };

      const preemptTimer = setTimeout(startBrowserIfNeeded, BROWSER_PREEMPT_MS);

      void (async () => {
        try {
          const blob = await synthesizeSpeech(trimmed, VOLCANO_FETCH_MS);
          clearTimeout(preemptTimer);
          if (gen !== speakGenRef.current) return;

          if (browserStarted) {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
          }

          await playVolcanoBlob(blob, gen);
        } catch {
          clearTimeout(preemptTimer);
          if (gen !== speakGenRef.current) return;
          if (!browserStarted) startBrowserIfNeeded();
        }
      })();
    },
    [enabled, stop, speakWithBrowser, playVolcanoBlob],
  );

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      if (prev) stop();
      return !prev;
    });
  }, [stop]);

  return {
    enabled,
    isSpeaking,
    isSupported,
    setEnabled,
    toggleEnabled,
    speak,
    stop,
  };
}
