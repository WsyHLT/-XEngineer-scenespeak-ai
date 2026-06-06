"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatBubble from "@/components/ChatBubble";
import MicDeviceSelect from "@/components/MicDeviceSelect";
import RecordButton from "@/components/RecordButton";
import RecordModeToggle from "@/components/RecordModeToggle";
import SessionReportModal from "@/components/SessionReportModal";
import TranscriptReviewPanel from "@/components/TranscriptReviewPanel";
import { useAudioRecorder, type RecordMode } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  assessPronunciation,
  buildDemoReport,
  initConversation,
  sendMessageStream,
  transcribeAudio,
} from "@/lib/api";
import { AudioTransport } from "@/lib/audioTransport";
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
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [transcriptReview, setTranscriptReview] = useState<string | null>(null);
  const [asrEngine, setAsrEngine] = useState<string | null>(null);
  const [wsAvailable, setWsAvailable] = useState(false);
  const [voiceHint, setVoiceHint] = useState(
    "按住麦克风说英文；AI 会用英文朗读回复",
  );
  const [micDeviceId, setMicDeviceId] = useState<string | null>(null);
  const [report, setReport] = useState<ReturnType<typeof buildDemoReport> | null>(null);
  const [correctionsLog, setCorrectionsLog] = useState<
    { user_utterance: string; correction: Correction }[]
  >([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<AudioTransport | null>(null);
  const turnCountRef = useRef(0);
  const pendingTranscriptRef = useRef<string | null>(null);
  const pendingAudioRef = useRef<{ blob: Blob; filename: string } | null>(null);
  const tts = useTextToSpeech();
  const speakRef = useRef(tts.speak);
  speakRef.current = tts.speak;

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
              speakRef.current(event.message.content);
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

  const openTranscriptReview = useCallback((text: string) => {
    setTranscriptReview(text);
    setVoiceHint("确认识别结果无误后，点击「确认发送」（请说英文）");
  }, []);

  const cancelTranscriptReview = useCallback(() => {
    setTranscriptReview(null);
    setAsrEngine(null);
    pendingAudioRef.current = null;
    setVoiceHint("按住麦克风说英文；AI 会用英文朗读回复");
  }, []);

  const confirmTranscriptReview = useCallback(async () => {
    const text = transcriptReview?.trim();
    if (!text || isProcessing) return;

    const pending = pendingAudioRef.current;
    setTranscriptReview(null);
    setAsrEngine(null);
    pendingAudioRef.current = null;
    setIsProcessing(true);
    setVoiceHint("");
    turnCountRef.current += 1;

    let userMsgId = "";

    try {
      const assessPromise = pending
        ? assessPronunciation(pending.blob, text, pending.filename).catch((err) => {
            const msg = err instanceof Error ? err.message : "发音评测失败";
            setVoiceHint(`发音评测失败：${msg.slice(0, 120)}`);
            return null;
          })
        : Promise.resolve(null);

      const chatTask = applyStreamEvents(
        (async function* () {
          for await (const event of sendMessageStream(sessionId, text)) {
            if (event.kind === "user_message") {
              userMsgId = event.message_id;
            }
            yield event;
          }
        })(),
      );

      const [assessment] = await Promise.all([assessPromise, chatTask]);

      if (assessment && userMsgId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsgId ? { ...m, pronunciation: assessment } : m,
          ),
        );
        scrollToBottom();
      }
    } catch (e) {
      let msg = e instanceof Error ? e.message : "发送失败";
      if (msg.includes("api_key") || msg.includes("credentials")) {
        msg = "后端未读取到 API Key，请在 backend/.env 配置 OPENAI_API_KEY";
      }
      setVoiceHint(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [applyStreamEvents, isProcessing, scrollToBottom, sessionId, transcriptReview]);

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

  const handleRecordedAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (blob.size < 500) {
        setVoiceHint("录音太短，请按住按钮至少 1 秒再说");
        return;
      }
      setIsTranscribing(true);
      setVoiceHint("正在识别语音…");
      try {
        const ext = mimeType.includes("mp4") ? "recording.mp4" : "recording.webm";
        pendingAudioRef.current = { blob, filename: ext };
        const { text, asr_engine } = await transcribeAudio(blob, ext);
        setAsrEngine(asr_engine);
        openTranscriptReview(text);
        if (/[\u4e00-\u9fff]/.test(text)) {
          setVoiceHint("识别结果含中文：请说英文，可手动修改或重新录音");
        }
      } catch (e) {
        let msg = e instanceof Error ? e.message : "语音识别失败";
        if (msg.includes("403") || msg.includes("Forbidden")) {
          msg =
            "海外 STT 服务返回 403。请确认 backend/.env 已配置 STT_PROVIDER=dashscope 和百炼 API Key";
        } else if (msg.includes("404")) {
          msg = "STT 接口不存在，请重启后端：uvicorn app.main:app --reload --port 8000";
        } else if (msg.includes("DeepSeek")) {
          msg = "DeepSeek 不支持语音，请配置 STT_PROVIDER=dashscope";
        } else if (
          msg.includes("name resolution") ||
          msg.includes("Cannot connect to host") ||
          msg.includes("DNS") ||
          msg.includes("DashScope（DNS")
        ) {
          msg =
            "无法连接阿里云语音服务（网络/DNS 异常）。请检查网络，或开代理后在 .env 设置 STT_HTTP_PROXY=http://127.0.0.1:7890 并重启后端";
        }
        setVoiceHint(msg);
      } finally {
        setIsTranscribing(false);
      }
    },
    [openTranscriptReview],
  );

  const recorder = useAudioRecorder({
    deviceId: micDeviceId,
    onChunk: (blob, mimeType) => {
      transportRef.current?.sendChunk(blob, mimeType);
    },
    onComplete: (blob, mimeType) => {
      if (!wsAvailable) {
        void handleRecordedAudio(blob, mimeType);
      }
    },
  });

  const handleRecordStart = useCallback(() => {
    setVoiceHint("");
    tts.stop();

    if (wsAvailable && transportRef.current?.isConnected) {
      void recorder.start();
      return;
    }

    void recorder.start();
  }, [recorder, tts, wsAvailable]);

  const handleRecordEnd = useCallback(() => {
    if (wsAvailable && transportRef.current?.isConnected) {
      if (recorder.isRecording) recorder.stop();
      transportRef.current.sendEnd();
      const text = pendingTranscriptRef.current;
      pendingTranscriptRef.current = null;
      if (text) openTranscriptReview(text);
      return;
    }

    if (recorder.isRecording) recorder.stop();
  }, [openTranscriptReview, recorder, wsAvailable]);

  const handleRecordToggle = useCallback(() => {
    if (recorder.isRecording) handleRecordEnd();
    else void handleRecordStart();
  }, [handleRecordEnd, handleRecordStart, recorder.isRecording]);

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
            speakRef.current(ev.message.content);
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
    tts.stop();
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

  const isListening = recorder.isRecording;
  const isReviewing = transcriptReview !== null;
  const isBusy = isProcessing || isInitializing || isTranscribing;

  const statusLabel = isReviewing
    ? "请确认识别文字"
    : isTranscribing
      ? "正在识别语音…"
      : tts.isSpeaking
        ? "AI 正在朗读…"
        : isProcessing
          ? "AI 思考中…"
          : recorder.isRecording
            ? recordMode === "hold"
              ? "正在录音，松开结束"
              : "正在录音，点击停止"
            : undefined;

  const defaultVoiceHint = "按住麦克风说英文；AI 会用英文朗读回复";
  const footerStatus =
    recorder.error ||
    statusLabel ||
    (voiceHint !== defaultVoiceHint ? voiceHint : null);

  const inputPlaceholder =
    recordMode === "hold" ? "输入英文，或按住左侧麦克风说话…" : "输入英文，或点击左侧麦克风录音…";

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
          <div className="flex items-center gap-2">
            {tts.isSupported && (
              <button
                type="button"
                onClick={tts.toggleEnabled}
                title={tts.enabled ? "关闭 AI 朗读" : "开启 AI 朗读"}
                className={`rounded-lg p-2 transition-colors ${
                  tts.enabled
                    ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                aria-label={tts.enabled ? "关闭 AI 朗读" : "开启 AI 朗读"}
              >
                {tts.isSpeaking ? (
                  <svg className="h-5 w-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-2-2.5L5 18H3V6h2l5-3.5V15.5z" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleEndSession}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              结束
            </button>
          </div>
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

        {/* 底部输入栏 */}
        <footer className="shrink-0 border-t border-slate-200/80 bg-white/90 px-3 py-2 backdrop-blur-md">
          <div className="mx-auto max-w-2xl">
            {transcriptReview !== null && (
              <div className="mb-2">
                <TranscriptReviewPanel
                  text={transcriptReview}
                  asrEngine={asrEngine}
                  onChange={setTranscriptReview}
                  onConfirm={() => void confirmTranscriptReview()}
                  onCancel={cancelTranscriptReview}
                  disabled={isProcessing}
                />
              </div>
            )}

            {showMicSettings && (
              <div className="mb-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                <MicDeviceSelect onDeviceChange={setMicDeviceId} />
              </div>
            )}

            <form onSubmit={handleTextSubmit} className="flex items-center gap-1.5">
              <RecordButton
                compact
                mode={recordMode}
                isRecording={isListening}
                isProcessing={isBusy && !isListening}
                statusLabel={statusLabel}
                disabled={isInitializing || isReviewing || !recorder.isSupported}
                onPressStart={handleRecordStart}
                onPressEnd={handleRecordEnd}
                onToggle={handleRecordToggle}
              />
              <RecordModeToggle
                mode={recordMode}
                onChange={setRecordMode}
                disabled={isBusy || isListening}
              />
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={inputPlaceholder}
                disabled={isBusy}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowMicSettings((v) => !v)}
                title="麦克风设置"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  showMicSettings
                    ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V19H9a1 1 0 100 2h6a1 1 0 100-2h-2v-1.08A7 7 0 0019 11z" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={isBusy || !textInput.trim()}
                className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                发送
              </button>
            </form>

            {footerStatus && (
              <p
                className={`mt-1 truncate text-center text-[11px] ${
                  recorder.error ? "text-red-500" : "text-slate-500"
                }`}
                title={footerStatus}
              >
                {footerStatus}
              </p>
            )}

            {!recorder.isSupported && (
              <p className="mt-1 text-center text-[11px] text-amber-600">
                麦克风不可用，请用文字输入
              </p>
            )}
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
