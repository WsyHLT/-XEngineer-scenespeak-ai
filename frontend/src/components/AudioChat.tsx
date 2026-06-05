"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatBubble from "@/components/ChatBubble";
import RecordButton from "@/components/RecordButton";
import SessionReportModal from "@/components/SessionReportModal";
import { useAudioRecorder, type RecordMode } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  buildDemoReport,
  initConversation,
  sendMessageStream,
  transcribeAudio,
} from "@/lib/api";
import { AudioTransport } from "@/lib/audioTransport";
import type { VoiceMode } from "@/hooks/useSpeechRecognition";
import type { ChatItem } from "@/types/chat";
import type { Correction, Scene, TurnEventPayload } from "@/types/api";

export type { ChatItem };

type Props = {
  sessionId: string;
  scene: Scene;
  startedAt: Date;
  onExit: () => void;
};

export default function AudioChat({
  sessionId,
  scene,
  startedAt,
  onExit,
}: Props) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [recordMode, setRecordMode] = useState<RecordMode>("hold");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("browser");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [wsAvailable, setWsAvailable] = useState(false);
  const [voiceHint, setVoiceHint] = useState(
    "按住红色按钮说英文；松开后 AI 会回复",
  );
  const [report, setReport] = useState<ReturnType<typeof buildDemoReport> | null>(null);
  const [correctionsLog, setCorrectionsLog] = useState<
    { user_utterance: string; correction: Correction }[]
  >([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<AudioTransport | null>(null);
  const turnCountRef = useRef(0);
  const pendingTranscriptRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /** 处理 SSE 流式事件 — 打字机效果 + 纠错附加 */
  const applyStreamEvents = useCallback(
    async (generator: AsyncGenerator<TurnEventPayload>) => {
      let currentAssistantId: string | null = null;

      for await (const event of generator) {
        switch (event.kind) {
          case "user_message":
            if (event.message) {
              setMessages((prev) => [
                ...prev,
                {
                  id: event.message_id,
                  role: "user",
                  content: event.message.content,
                },
              ]);
              scrollToBottom();
            }
            break;

          case "assistant_delta":
            if (!currentAssistantId) {
              currentAssistantId = event.message_id;
              setStreamingId(event.message_id);
              setStreamingText(event.delta ?? "");
            } else {
              setStreamingText((prev) => prev + (event.delta ?? ""));
            }
            scrollToBottom();
            break;

          case "assistant_done":
            if (event.message) {
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === event.message_id);
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    id: event.message_id,
                    role: "assistant",
                    content: event.message!.content,
                  },
                ];
              });
            }
            setStreamingId(null);
            setStreamingText("");
            currentAssistantId = null;
            scrollToBottom();
            break;

          case "correction":
            if (event.correction) {
              setMessages((prev) => {
                const updated = prev.map((m) =>
                  m.id === event.message_id
                    ? { ...m, correction: event.correction! }
                    : m,
                );
                const userMsg = updated.find((m) => m.id === event.message_id);
                if (userMsg) {
                  setCorrectionsLog((log) => [
                    ...log,
                    {
                      user_utterance: userMsg.content,
                      correction: event.correction!,
                    },
                  ]);
                }
                return updated;
              });
              scrollToBottom();
            }
            break;
        }
      }
    },
    [scrollToBottom],
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);
      setVoiceHint("");
      turnCountRef.current += 1;

      try {
        await applyStreamEvents(sendMessageStream(sessionId, trimmed));
      } catch (e) {
        let msg = e instanceof Error ? e.message : "发送失败";
        if (msg.includes("api_key") || msg.includes("credentials") || msg.includes("Missing credentials")) {
          msg = "后端未读取到 API Key，请在 backend/.env 中配置 OPENAI_API_KEY 并重启 uvicorn";
        } else if (msg.includes("abort") || msg.toLowerCase().includes("timed out") || msg.includes("超时")) {
          msg = "LLM 请求超时：Gemini/Google API 可能无法从当前网络访问。请改用 DeepSeek/通义千问，或配置代理后重启后端";
        } else if (msg.includes("网络连接失败") || msg.includes("无法连接 API")) {
          msg = msg;
        }
        setVoiceHint(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [applyStreamEvents, isProcessing, sessionId],
  );

  /** WebSocket 音频传输（后端 STT 实现后自动启用） */
  const initTransport = useCallback(() => {
    const wsBase =
      process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/api/chat/ws";
    const transport = new AudioTransport(wsBase, sessionId, {
      onTranscript: (text, isFinal) => {
        if (isFinal && text) pendingTranscriptRef.current = text;
      },
      onOpen: () => setWsAvailable(true),
      onError: () => setWsAvailable(false),
    });

    transport.connect().catch(() => {
      setWsAvailable(false);
    });

    transportRef.current = transport;
  }, [sessionId]);

  const speech = useSpeechRecognition(
    (text) => {
      void sendText(text);
    },
    () => {
      setVoiceHint("未识别到语音：请按住按钮、清晰说英文后再松开");
    },
  );

  const handleRecordedAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (blob.size < 500) {
        setVoiceHint("录音太短，请按住按钮多说 1-2 秒");
        return;
      }
      setIsTranscribing(true);
      setVoiceHint("正在识别语音…");
      try {
        const ext = mimeType.includes("mp4") ? "recording.mp4" : "recording.webm";
        const text = await transcribeAudio(blob, ext);
        await sendText(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "语音识别失败";
        setVoiceHint(
          msg.includes("DeepSeek") || msg.includes("STT")
            ? "DeepSeek 不支持语音转文字。请在 backend/.env 配置 Groq Whisper（见说明）"
            : msg,
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [sendText],
  );

  const recorder = useAudioRecorder({
    onChunk: (blob, mimeType) => {
      transportRef.current?.sendChunk(blob, mimeType);
    },
    onComplete: (blob, mimeType) => {
      if (voiceMode === "record" && !wsAvailable) {
        void handleRecordedAudio(blob, mimeType);
      }
    },
  });

  const handleRecordStart = useCallback(() => {
    setVoiceHint("");

    if (wsAvailable && transportRef.current?.isConnected) {
      speech.reset();
      void recorder.start();
      return;
    }

    if (voiceMode === "browser") {
      speech.reset();
      speech.startListening();
      return;
    }

    // 录音识别模式：仅 MediaRecorder，不与浏览器 STT 抢麦克风
    speech.reset();
    void recorder.start();
  }, [recorder, speech, voiceMode, wsAvailable]);

  const handleRecordEnd = useCallback(() => {
    if (wsAvailable && transportRef.current?.isConnected) {
      if (recorder.isRecording) recorder.stop();
      transportRef.current.sendEnd();
      const text = pendingTranscriptRef.current;
      pendingTranscriptRef.current = null;
      if (text) void sendText(text);
      return;
    }

    if (voiceMode === "browser") {
      speech.stopListening();
      return;
    }

    if (recorder.isRecording) recorder.stop();
  }, [recorder, sendText, speech, voiceMode, wsAvailable]);

  const handleRecordToggle = useCallback(() => {
    if (recorder.isRecording || speech.isListening) handleRecordEnd();
    else handleRecordStart();
  }, [handleRecordEnd, handleRecordStart, recorder.isRecording, speech.isListening]);

  /** 初始化 AI 开场白 */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const events = await initConversation(sessionId);
        if (cancelled) return;

        let openingId: string | null = null;
        let openingText = "";

        for (const ev of events) {
          if (ev.kind === "assistant_delta") {
            openingId = ev.message_id;
            openingText += ev.delta ?? "";
            setStreamingId(ev.message_id);
            setStreamingText(openingText);
          }
          if (ev.kind === "assistant_done" && ev.message) {
            setMessages([
              {
                id: ev.message_id,
                role: "assistant",
                content: ev.message.content,
              },
            ]);
            setStreamingId(null);
            setStreamingText("");
          }
        }
      } catch {
        setVoiceHint("无法加载开场白，请确认后端已启动 (localhost:8000)");
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    initTransport();

    return () => {
      cancelled = true;
      transportRef.current?.disconnect();
    };
  }, [initTransport, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const handleEndSession = () => {
    const demoReport = buildDemoReport(
      sessionId,
      scene,
      correctionsLog,
      turnCountRef.current,
      startedAt,
    );
    setReport(demoReport);
    transportRef.current?.disconnect();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendText(textInput);
    setTextInput("");
  };

  const isListening =
    voiceMode === "browser"
      ? speech.isListening
      : recorder.isRecording;
  const isBusy = isProcessing || isInitializing || isTranscribing;

  const statusLabel = isTranscribing
    ? "正在识别语音…"
    : isProcessing
      ? "AI 思考中…"
      : speech.isListening
        ? "正在聆听，请说英文…"
        : recorder.isRecording
          ? "正在录音…"
          : undefined;

  return (
    <>
      <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100">
        {/* 顶栏 */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="返回"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="font-semibold text-slate-900">
              {scene.icon} {scene.name_zh}
            </h1>
            <p className="text-xs text-slate-400">{scene.name}</p>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            结束
          </button>
        </header>

        {/* 对话区 */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {isInitializing && messages.length === 0 && !streamingText && (
              <p className="text-center text-sm text-slate-400">AI 教练正在加入…</p>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} item={msg} />
            ))}

            {streamingId && (
              <ChatBubble
                item={{ id: streamingId, role: "assistant", content: "" }}
                streamingText={streamingText}
                isStreaming
              />
            )}

            <div ref={chatEndRef} />
          </div>
        </main>

        {/* 底部控制区 */}
        <footer className="shrink-0 border-t border-slate-200/80 bg-white/90 px-4 py-5 backdrop-blur-md">
          <div className="mx-auto max-w-2xl">
            {/* 语音模式切换 */}
            <div className="mb-3 flex justify-center gap-2">
              {(
                [
                  { id: "record" as VoiceMode, label: "录音识别（推荐）" },
                  { id: "browser" as VoiceMode, label: "浏览器识别" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVoiceMode(id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    voiceMode === id
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 录音方式 */}
            <div className="mb-4 flex justify-center gap-2">
              {(["hold", "toggle"] as RecordMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRecordMode(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    recordMode === m
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {m === "hold" ? "按住说话" : "点击开关"}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center">
              <RecordButton
                mode={recordMode}
                isRecording={isListening}
                isProcessing={isBusy && !isListening}
                statusLabel={statusLabel}
                disabled={
                  isInitializing ||
                  (voiceMode === "browser" && !speech.isSupported) ||
                  (voiceMode === "record" && !recorder.isSupported)
                }
                onPressStart={handleRecordStart}
                onPressEnd={handleRecordEnd}
                onToggle={handleRecordToggle}
              />

              {(voiceHint || recorder.error || speech.error) && (
                <p className={`mt-2 max-w-md text-center text-xs ${speech.error || recorder.error ? "text-red-500" : "text-slate-500"}`}>
                  {speech.error || recorder.error || voiceHint}
                </p>
              )}

              {speech.isListening && speech.transcript && (
                <p className="mt-2 max-w-md text-center text-sm text-indigo-600">
                  「{speech.transcript}」
                </p>
              )}

              {voiceMode === "record" && !wsAvailable && (
                <p className="mt-1 text-center text-xs text-slate-400">
                  录音识别需配置 STT（Groq Whisper）；DeepSeek 仅支持文字对话
                </p>
              )}

              {!recorder.isSupported && !speech.isSupported && (
                <p className="mt-2 text-xs text-amber-600">麦克风不可用，请使用文字输入</p>
              )}
            </div>

            {/* 文字输入降级 */}
            <form onSubmit={handleTextSubmit} className="mt-4 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="或输入英文文字…"
                disabled={isBusy}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isBusy || !textInput.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                发送
              </button>
            </form>
          </div>
        </footer>
      </div>

      {report && (
        <SessionReportModal
          report={report}
          onClose={() => setReport(null)}
          onRestart={onExit}
        />
      )}
    </>
  );
}
