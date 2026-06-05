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
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
};

export function useSpeechRecognition(
  onResult?: (text: string) => void,
  onEmpty?: () => void,
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTextRef = useRef("");
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
    stoppedByUserRef.current = false;
  }, []);

  const startListening = useCallback(() => {
    if (!Ctor) {
      setError("浏览器不支持 Web Speech API");
      return;
    }

    reset();
    stoppedByUserRef.current = false;

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (ev: SpeechRecognitionEvent) => {
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
        setError("麦克风权限被拒绝，请在地址栏允许麦克风");
      } else if (ev.error === "no-speech") {
        setError("未检测到语音，请按住按钮并清晰说英文");
      } else if (ev.error !== "aborted") {
        setError(`语音识别错误: ${ev.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!stoppedByUserRef.current) return;

      // 等待 Chrome 提交 final result
      setTimeout(() => {
        const text = finalTextRef.current.trim();
        if (text) onResultRef.current?.(text);
        else onEmptyRef.current?.();
      }, 200);
    };

    try {
      recognition.start();
    } catch {
      setError("无法启动语音识别，请改用「录音识别」模式");
    }
  }, [Ctor, reset]);

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
