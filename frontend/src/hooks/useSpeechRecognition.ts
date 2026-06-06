"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceMode = "record" | "browser";

export type UseSpeechRecognitionReturn = {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  reset: () => void;
};

/** 按住说话前先确保麦克风权限，再启动 Web Speech API */
export function useSpeechRecognition(
  onResult?: (text: string) => void,
  onEmpty?: () => void,
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTextRef = useRef("");
  const gotAnyResultRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onEmptyRef = useRef(onEmpty);
  const stoppedByUserRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
    onEmptyRef.current = onEmpty;
  }, [onResult, onEmpty]);

  const Ctor = getSpeechRecognition();
  const isSupported = Ctor !== null;

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    finalTextRef.current = "";
    gotAnyResultRef.current = false;
    stoppedByUserRef.current = false;
  }, []);

  const ensureMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      setError("请允许麦克风权限（地址栏锁图标 → 麦克风 → 允许）");
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!Ctor) {
      setError("请使用 Chrome 或 Edge；国内建议用「录音识别」+ 阿里云百炼 STT");
      return;
    }

    const micOk = await ensureMic();
    if (!micOk) return;

    reset();
    gotAnyResultRef.current = false;

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (ev: SpeechRecognitionEvent) => {
      gotAnyResultRef.current = true;
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const part = ev.results[i][0]?.transcript ?? "";
        if (ev.results[i].isFinal) finalTextRef.current += part;
        else interim += part;
      }
      setTranscript((finalTextRef.current + interim).trim());
    };

    recognition.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "not-allowed") {
        setError("麦克风权限被拒绝");
      } else if (ev.error === "network") {
        setError("浏览器语音识别需访问 Google 服务，国内请改用「录音识别」");
      } else if (ev.error === "no-speech") {
        setError("未检测到语音，按住按钮至少 2 秒并清晰说英文");
      } else if (ev.error !== "aborted") {
        setError(`语音识别: ${ev.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!stoppedByUserRef.current) return;

      setTimeout(() => {
        const text = finalTextRef.current.trim();
        if (text) {
          onResultRef.current?.(text);
        } else if (gotAnyResultRef.current) {
          onEmptyRef.current?.();
        } else {
          setError(
            "无法连接 Google 语音服务。请切换「录音识别」并配置阿里云百炼 STT，或使用底部文字输入",
          );
        }
      }, 400);
    };

    try {
      recognition.start();
    } catch {
      setError("无法启动语音识别，请改用录音识别模式");
    }
  }, [Ctor, ensureMic, reset]);

  const stopListening = useCallback(() => {
    stoppedByUserRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  };
}
