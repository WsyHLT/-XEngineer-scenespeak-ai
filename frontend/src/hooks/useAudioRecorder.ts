"use client";

import { useCallback, useRef, useState } from "react";

export type RecordMode = "hold" | "toggle";

export type UseAudioRecorderOptions = {
  /** 每段音频数据可用时触发 — 用于 WebSocket 流式上传 */
  onChunk?: (blob: Blob, mimeType: string) => void;
  /** 录音完整结束 — 返回合并后的 Blob */
  onComplete?: (blob: Blob, mimeType: string) => void;
  mimeType?: string;
  timeslice?: number;
};

export type UseAudioRecorderReturn = {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** 按住说话：按下开始 */
  handlePressStart: () => void;
  /** 按住说话：松开结束 */
  handlePressEnd: () => void;
  /** 点击开关：切换录音状态 */
  toggle: () => void;
};

function pickMimeType(preferred?: string): string {
  const candidates = [
    preferred,
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].filter(Boolean) as string[];

  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const { onChunk, onComplete, mimeType: preferredMime, timeslice = 250 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");

  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("当前浏览器不支持录音");
      return;
    }
    if (isRecording) return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = pickMimeType(preferredMime);
      mimeRef.current = mime;

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          onChunk?.(ev.data, mime);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        onComplete?.(blob, mime);
        chunksRef.current = [];
        cleanupStream();
        setIsRecording(false);
      };

      recorder.onerror = () => {
        setError("录音出错");
        setIsRecording(false);
        cleanupStream();
      };

      recorder.start(timeslice);
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法访问麦克风");
      cleanupStream();
    }
  }, [cleanupStream, isRecording, isSupported, onChunk, onComplete, preferredMime, timeslice]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const handlePressStart = useCallback(() => {
    void start();
  }, [start]);

  const handlePressEnd = useCallback(() => {
    stop();
  }, [stop]);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else void start();
  }, [isRecording, start, stop]);

  return {
    isRecording,
    isSupported,
    error,
    start,
    stop,
    handlePressStart,
    handlePressEnd,
    toggle,
  };
}
