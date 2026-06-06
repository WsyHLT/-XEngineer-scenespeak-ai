"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { synthesizeSpeech } from "@/lib/api";

export type SpeakOptions = {
  messageId?: string;
  voiceId?: string;
};

export type PlaybackState = "idle" | "playing" | "paused" | "stopped" | "ended";

export type UseTextToSpeechReturn = {
  enabled: boolean;
  isSpeaking: boolean;
  isAudioPlaying: boolean;
  isPaused: boolean;
  playbackState: PlaybackState;
  isSupported: boolean;
  /** 当前绑定进度条的消息 ID（播放/暂停/停止后仍保留） */
  sessionMessageId: string | null;
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  setEnabled: (on: boolean) => void;
  toggleEnabled: () => void;
  speak: (text: string, options?: SpeakOptions) => void;
  pause: () => void;
  resume: () => void;
  /** 停止播放但保留进度条与会话 */
  stopPlayback: () => void;
  seekTo: (ratio: number) => void;
  /** @deprecated 使用 stopPlayback */
  stop: () => void;
};

const BROWSER_PREEMPT_MS = 4_500;
const VOLCANO_FETCH_MS = 8_000;

function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
  voiceId?: string,
): SpeechSynthesisVoice | undefined {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (en.length === 0) return undefined;

  const lower = (v: SpeechSynthesisVoice) => v.name.toLowerCase();

  if (voiceId?.includes("407")) {
    return (
      en.find((v) => v.lang.toLowerCase().startsWith("en-gb")) ??
      en.find((v) => lower(v).includes("uk") || lower(v).includes("british")) ??
      en.find((v) => lower(v).includes("male")) ??
      en[0]
    );
  }
  if (voiceId?.includes("406")) {
    return (
      en.find((v) => lower(v).includes("daniel") || lower(v).includes("david")) ??
      en.find((v) => lower(v).includes("male") && !lower(v).includes("female")) ??
      en[0]
    );
  }
  if (voiceId?.includes("415")) {
    return (
      en.find((v) => lower(v).includes("karen") || lower(v).includes("zira")) ??
      en.find((v) => lower(v).includes("female")) ??
      en[0]
    );
  }
  if (voiceId?.includes("700")) {
    return (
      en.find((v) => v.lang.toLowerCase() === "en-us" && lower(v).includes("samantha")) ??
      en.find((v) => lower(v).includes("female")) ??
      en.find((v) => v.lang.toLowerCase() === "en-us") ??
      en[0]
    );
  }

  return (
    en.find((v) => v.lang.toLowerCase() === "en-us" && v.localService) ??
    en.find((v) => v.lang.toLowerCase() === "en-us") ??
    en.find((v) => v.localService) ??
    en[0]
  );
}

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, words * 0.42);
}

/** 按估算进度截取剩余文本（浏览器 TTS 无法 seek，只能重读剩余部分） */
function textFromTimeOffset(text: string, offsetSec: number, totalDuration: number): string {
  const trimmed = text.trim();
  if (offsetSec <= 0.05 || totalDuration <= 0) return trimmed;
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return trimmed;
  const ratio = Math.min(0.98, offsetSec / totalDuration);
  const startIdx = Math.min(words.length - 1, Math.floor(ratio * words.length));
  const rest = words.slice(startIdx).join(" ");
  return rest.length > 0 ? rest : trimmed;
}

async function waitForAudioMetadata(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    audio.addEventListener("loadedmetadata", done, { once: true });
    audio.addEventListener("error", done, { once: true });
  });
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [enabled, setEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [sessionMessageId, setSessionMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speakGenRef = useRef(0);
  const browserTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const browserStartRef = useRef(0);
  const browserDurationRef = useRef(0);
  const browserOffsetRef = useRef(0);
  const pauseAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const cachedBlobRef = useRef<Blob | null>(null);
  const sessionRef = useRef<{
    text: string;
    messageId?: string;
    voiceId?: string;
  } | null>(null);
  const activeVoiceIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const refresh = () => pickEnglishVoice(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const clearBrowserTimer = useCallback(() => {
    if (browserTimerRef.current) {
      clearInterval(browserTimerRef.current);
      browserTimerRef.current = null;
    }
  }, []);

  const detachAudioElement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.onloadedmetadata = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const syncProgressFromAudio = useCallback((audio: HTMLAudioElement) => {
    const dur = audio.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    elapsedRef.current = audio.currentTime;
    setAudioDuration(dur);
    setAudioCurrentTime(audio.currentTime);
    setAudioProgress((audio.currentTime / dur) * 100);
  }, []);

  const startBrowserProgress = useCallback(
    (duration: number, gen: number, offsetSec = 0) => {
      browserDurationRef.current = duration;
      browserOffsetRef.current = offsetSec;
      browserStartRef.current = Date.now() - offsetSec * 1000;
      setAudioDuration(duration);
      clearBrowserTimer();
      browserTimerRef.current = setInterval(() => {
        if (gen !== speakGenRef.current) return;
        const elapsed = (Date.now() - browserStartRef.current) / 1000;
        const p = Math.min(1, elapsed / duration);
        elapsedRef.current = elapsed;
        setAudioCurrentTime(elapsed);
        setAudioProgress(p * 100);
        if (p >= 1) clearBrowserTimer();
      }, 100);
    },
    [clearBrowserTimer],
  );

  /** 彻底中断（切换新消息播放前） */
  const abortPlayback = useCallback(() => {
    speakGenRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    detachAudioElement();
    clearBrowserTimer();
    setIsSpeaking(false);
    setIsPaused(false);
    setPlaybackState("idle");
    setSessionMessageId(null);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    elapsedRef.current = 0;
    pauseAtRef.current = 0;
    cachedBlobRef.current = null;
    sessionRef.current = null;
  }, [clearBrowserTimer, detachAudioElement]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      syncProgressFromAudio(audioRef.current);
      pauseAtRef.current = audioRef.current.currentTime;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
      }
    }
    clearBrowserTimer();
    setIsSpeaking(false);
    setIsPaused(true);
    setPlaybackState("stopped");
  }, [clearBrowserTimer, syncProgressFromAudio]);

  const pause = useCallback(() => {
    pauseAtRef.current = elapsedRef.current;

    const markPaused = () => {
      setIsSpeaking(false);
      setIsPaused(true);
      setPlaybackState("paused");
    };

    // HTMLAudio：无论是否已 paused，都同步 UI 到暂停态
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      syncProgressFromAudio(audioRef.current);
      pauseAtRef.current = audioRef.current.currentTime;
      markPaused();
      return;
    }

    // 浏览器 TTS 正在朗读
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
      pauseAtRef.current = elapsedRef.current;
      browserOffsetRef.current = elapsedRef.current;
      clearBrowserTimer();
      window.speechSynthesis.cancel();
      markPaused();
      return;
    }

    // 浏览器 TTS 进度计时中（speechSynthesis.speaking 可能已为 false）
    if (browserTimerRef.current) {
      pauseAtRef.current = elapsedRef.current;
      browserOffsetRef.current = elapsedRef.current;
      clearBrowserTimer();
      window.speechSynthesis?.cancel();
      markPaused();
    }
  }, [clearBrowserTimer, syncProgressFromAudio]);

  const playVolcanoBlob = useCallback(
    async (blob: Blob, gen: number, messageId?: string, startAtSec = 0) => {
      detachAudioElement();
      cachedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      setSessionMessageId(messageId ?? null);
      setPlaybackState("playing");

      audio.onloadedmetadata = () => {
        if (gen !== speakGenRef.current) return;
        syncProgressFromAudio(audio);
      };
      audio.ontimeupdate = () => {
        if (gen === speakGenRef.current) syncProgressFromAudio(audio);
      };
      audio.onplay = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(true);
          setIsPaused(false);
          setPlaybackState("playing");
        }
      };
      audio.onpause = () => {
        if (gen === speakGenRef.current && audio.currentTime < audio.duration) {
          syncProgressFromAudio(audio);
        }
      };
      audio.onended = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setAudioProgress(100);
          setPlaybackState("ended");
          detachAudioElement();
        }
      };
      audio.onerror = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setPlaybackState("stopped");
          detachAudioElement();
        }
      };

      await waitForAudioMetadata(audio);
      if (gen !== speakGenRef.current) return;

      if (startAtSec > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(startAtSec, audio.duration - 0.01);
        elapsedRef.current = audio.currentTime;
        pauseAtRef.current = audio.currentTime;
      }
      syncProgressFromAudio(audio);

      await audio.play();
    },
    [detachAudioElement, syncProgressFromAudio],
  );

  const seekTo = useCallback(
    (ratio: number) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = clamped * audio.duration;
        syncProgressFromAudio(audio);
        pauseAtRef.current = audio.currentTime;
        return;
      }
      const dur = browserDurationRef.current;
      if (dur > 0) {
        const t = clamped * dur;
        browserOffsetRef.current = t;
        browserStartRef.current = Date.now() - t * 1000;
        elapsedRef.current = t;
        pauseAtRef.current = t;
        setAudioCurrentTime(t);
        setAudioProgress(clamped * 100);
      }
    },
    [syncProgressFromAudio],
  );

  const speakWithBrowser = useCallback(
    (
      trimmed: string,
      gen: number,
      messageId?: string,
      voiceId?: string,
      progressOffsetSec = 0,
    ) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const duration = estimateDuration(trimmed);
      startBrowserProgress(duration, gen, progressOffsetSec);
      setSessionMessageId(messageId ?? null);
      setPlaybackState("playing");

      const voices = window.speechSynthesis.getVoices();
      const picked = pickEnglishVoice(voices, voiceId ?? activeVoiceIdRef.current);

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.lang = picked?.lang ?? "en-US";
      utterance.rate = voiceId?.includes("406") ? 0.92 : 0.95;
      utterance.pitch = voiceId?.includes("415") ? 1.15 : voiceId?.includes("407") ? 0.85 : 1;
      if (picked) utterance.voice = picked;

      utterance.onstart = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(true);
          setIsPaused(false);
          setPlaybackState("playing");
        }
      };
      utterance.onend = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setAudioProgress(100);
          setAudioCurrentTime(duration);
          setPlaybackState("ended");
          clearBrowserTimer();
        }
      };
      utterance.onerror = () => {
        if (gen === speakGenRef.current) {
          setIsSpeaking(false);
          setIsPaused(false);
          setPlaybackState("stopped");
          clearBrowserTimer();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearBrowserTimer, startBrowserProgress],
  );

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const trimmed = text.trim();
      if (!enabled || !trimmed) return;

      abortPlayback();
      const gen = speakGenRef.current;
      activeVoiceIdRef.current = options?.voiceId;
      sessionRef.current = {
        text: trimmed,
        messageId: options?.messageId,
        voiceId: options?.voiceId,
      };
      let browserStarted = false;

      const startBrowserIfNeeded = () => {
        if (browserStarted || gen !== speakGenRef.current) return;
        browserStarted = true;
        speakWithBrowser(trimmed, gen, options?.messageId, options?.voiceId);
      };

      const preemptTimer = setTimeout(startBrowserIfNeeded, BROWSER_PREEMPT_MS);

      void (async () => {
        try {
          const blob = await synthesizeSpeech(trimmed, VOLCANO_FETCH_MS, options?.voiceId);
          clearTimeout(preemptTimer);
          if (gen !== speakGenRef.current) return;

          if (browserStarted) {
            window.speechSynthesis?.cancel();
            clearBrowserTimer();
            setIsSpeaking(false);
          }

          await playVolcanoBlob(blob, gen, options?.messageId);
        } catch {
          clearTimeout(preemptTimer);
          if (gen !== speakGenRef.current) return;
          if (!browserStarted) startBrowserIfNeeded();
        }
      })();
    },
    [enabled, abortPlayback, speakWithBrowser, playVolcanoBlob, clearBrowserTimer],
  );

  const resume = useCallback(async () => {
    const gen = speakGenRef.current;
    const startAt = pauseAtRef.current;

    const markPlaying = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setPlaybackState("playing");
    };

    // 1) 已有 Audio 元素 — 从暂停位置继续（不重建元素）
    const audio = audioRef.current;
    if (audio?.paused) {
      const dur = audio.duration;
      const atEnd = Number.isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.05;
      if (!atEnd) {
        try {
          await waitForAudioMetadata(audio);
          const target = Math.max(startAt, audio.currentTime);
          if (target > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(target, audio.duration - 0.01);
          }
          syncProgressFromAudio(audio);
          await audio.play();
          markPlaying();
          return;
        } catch {
          // fall through — 尝试 blob 断点续播
        }
      }
    }

    // 2) 从缓存 blob 断点续播（Audio 元素丢失时）
    if (cachedBlobRef.current && startAt >= 0) {
      try {
        await playVolcanoBlob(
          cachedBlobRef.current,
          gen,
          sessionRef.current?.messageId ?? undefined,
          startAt,
        );
        return;
      } catch {
        // fall through
      }
    }

    // 3) 浏览器 TTS resume（原生 pause 状态，极少见）
    if (typeof window !== "undefined" && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      startBrowserProgress(
        browserDurationRef.current,
        gen,
        startAt || browserOffsetRef.current,
      );
      markPlaying();
      return;
    }

    const sess = sessionRef.current;
    if (!sess) return;

    const totalDur = browserDurationRef.current || estimateDuration(sess.text);
    const offset = startAt || browserOffsetRef.current;

    // 4) 浏览器 TTS（cancel 后从剩余文本续读）
    if (!audioRef.current && !cachedBlobRef.current) {
      const remaining = textFromTimeOffset(sess.text, offset, totalDur);
      speakWithBrowser(
        remaining,
        gen,
        sess.messageId,
        sess.voiceId,
        offset,
      );
      markPlaying();
      return;
    }

    // 5) 兜底：blob 断点续播（避免 speak() 触发 abortPlayback 从头播）
    if (cachedBlobRef.current) {
      await playVolcanoBlob(cachedBlobRef.current, gen, sess.messageId, offset);
    }
  }, [playVolcanoBlob, startBrowserProgress, speakWithBrowser, syncProgressFromAudio]);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      if (prev) abortPlayback();
      return !prev;
    });
  }, [abortPlayback]);

  return {
    enabled,
    isSpeaking,
    isAudioPlaying: isSpeaking && !isPaused,
    isPaused,
    playbackState,
    isSupported: true,
    sessionMessageId,
    audioProgress,
    audioCurrentTime,
    audioDuration,
    setEnabled,
    toggleEnabled,
    speak,
    pause,
    resume,
    stopPlayback,
    seekTo,
    stop: stopPlayback,
  };
}
