"use client";

import { useCallback, useRef, useState } from "react";

import { getStoredMicDeviceId } from "@/lib/micDevices";

export type RecordMode = "hold" | "toggle";

export type UseAudioRecorderOptions = {
  /** 每段音频数据可用时触发 — 用于 WebSocket 流式上传 */
  onChunk?: (blob: Blob, mimeType: string) => void;
  /** 录音完整结束 — 返回合并后的 Blob */
  onComplete?: (blob: Blob, mimeType: string) => void;
  /** 指定麦克风 deviceId；不传则读 localStorage 或系统默认 */
  deviceId?: string | null;
  mimeType?: string;
  timeslice?: number;
  /** 最短有效录音时长（毫秒），低于此值不上传 */
  minDurationMs?: number;
};

export type UseAudioRecorderReturn = {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  activeDeviceLabel: string | null;
  start: () => Promise<void>;
  stop: () => void;
  handlePressStart: () => void;
  handlePressEnd: () => void;
  toggle: () => void;
};

const DEFAULT_MIN_DURATION_MS = 800;

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

function buildAudioConstraints(deviceId?: string | null): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: true,
    channelCount: 1,
  };
  const id = deviceId || getStoredMicDeviceId();
  if (id) {
    return { ...base, deviceId: { ideal: id } };
  }
  return base;
}

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const {
    onChunk,
    onComplete,
    deviceId,
    mimeType: preferredMime,
    timeslice = 250,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDeviceLabel, setActiveDeviceLabel] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const startingRef = useRef(false);
  const stopPendingRef = useRef(false);
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopInternal = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    const finalizeStop = () => {
      try {
        if (recorder.state === "recording") {
          recorder.requestData();
        }
      } catch {
        // 部分浏览器不支持 requestData
      }
      try {
        recorder.stop();
      } catch {
        cleanupStream();
        setIsRecording(false);
      }
    };

    setTimeout(finalizeStop, 80);
  }, [cleanupStream]);

  const stop = useCallback(() => {
    if (startingRef.current) {
      stopPendingRef.current = true;
      return;
    }
    stopInternal();
  }, [stopInternal]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("当前浏览器不支持录音");
      return;
    }
    if (isRecording || startingRef.current) return;

    startingRef.current = true;
    stopPendingRef.current = false;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildAudioConstraints(deviceIdRef.current),
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings();
      setActiveDeviceLabel(track?.label || settings?.deviceId || "未知设备");

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
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);

        if (durationMs < minDurationMs || blob.size < 500) {
          setError("录音太短，请按住至少 1 秒再松开");
          return;
        }
        // 不在前端拦截「静音」—— Chrome/Cursor 音量标定不同，交给后端 ASR 判断
        onComplete?.(blob, mime);
      };

      recorder.onerror = () => {
        setError("录音出错");
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);
      };

      recorder.start(timeslice);
      startedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("无法访问麦克风");
      if (err.name === "NotAllowedError") {
        setError(
          "Chrome 未允许麦克风。点击地址栏锁图标 → 麦克风 → 允许，然后按 F5 刷新本页",
        );
      } else if (err.name === "NotFoundError") {
        setError("未找到麦克风设备，请检查系统声音设置或在下拉框中换一台设备");
      } else {
        setError(err.message || "无法访问麦克风");
      }
      cleanupStream();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    } finally {
      startingRef.current = false;
      if (stopPendingRef.current) {
        stopPendingRef.current = false;
        stopInternal();
      }
    }
  }, [
    cleanupStream,
    isRecording,
    isSupported,
    minDurationMs,
    onChunk,
    onComplete,
    preferredMime,
    stopInternal,
    timeslice,
  ]);

  const handlePressStart = useCallback(() => {
    void start();
  }, [start]);

  const handlePressEnd = useCallback(() => {
    stop();
  }, [stop]);

  const toggle = useCallback(() => {
    if (isRecording || startingRef.current) stop();
    else void start();
  }, [isRecording, start, stop]);

  return {
    isRecording,
    isSupported,
    error,
    activeDeviceLabel,
    start,
    stop,
    handlePressStart,
    handlePressEnd,
    toggle,
  };
}
