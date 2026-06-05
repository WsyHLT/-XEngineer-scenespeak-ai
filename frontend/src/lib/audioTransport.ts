/**
 * 音频传输层 — 对接后端 WebSocket /api/chat/ws
 *
 * 协议（与 backend/app/schemas/websocket.py 一致）：
 *   Client → audio_chunk { chunk: base64, sequence, mime_type }
 *   Client → audio_end   { sequence }
 *   Server → transcript / correction / assistant_message / assistant_audio
 *
 * 当前后端 WS + STT 尚未实现时，AudioChat 会降级到 Web Speech API + SSE。
 */

import type { WSServerEvent } from "@/types/api";

export type AudioTransportCallbacks = {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onEvent?: (event: WSServerEvent) => void;
  onError?: (code: string, message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class AudioTransport {
  private ws: WebSocket | null = null;
  private sequence = 0;

  constructor(
    private wsUrl: string,
    private sessionId: string,
    private callbacks: AudioTransportCallbacks = {},
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?session_id=${encodeURIComponent(this.sessionId)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.callbacks.onOpen?.();
        resolve();
      };

      this.ws.onerror = () => reject(new Error("WebSocket connection failed"));

      this.ws.onclose = () => this.callbacks.onClose?.();

      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as WSServerEvent;
          this.callbacks.onEvent?.(data);

          if (data.type === "transcript") {
            this.callbacks.onTranscript?.(data.text, data.is_final);
          }
          if (data.type === "error") {
            this.callbacks.onError?.(data.code, data.message);
          }
        } catch {
          // ignore malformed frames
        }
      };
    });
  }

  /** 发送单个音频片段（MediaRecorder ondataavailable 回调中调用） */
  sendChunk(blob: Blob, mimeType = "audio/webm"): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      this.ws?.send(
        JSON.stringify({
          type: "audio_chunk",
          session_id: this.sessionId,
          chunk: base64,
          sequence: this.sequence++,
          mime_type: mimeType,
        }),
      );
    };
    reader.readAsDataURL(blob);
  }

  /** 一句话录音结束 — 触发后端 STT + LLM */
  sendEnd(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "audio_end",
        session_id: this.sessionId,
        sequence: this.sequence - 1,
      }),
    );
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.sequence = 0;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/** Blob → Base64（供调试或非 FileReader 场景） */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
