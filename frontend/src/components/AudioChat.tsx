"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import CoachAvatarPanel from "@/components/chat/CoachAvatarPanel";
import CyberChatBubble from "@/components/chat/CyberChatBubble";
import CyberControlBar from "@/components/chat/CyberControlBar";
import InteractiveRadarChart from "@/components/chat/InteractiveRadarChart";
import ReportDetailModal from "@/components/ReportDetailModal";
import TranscriptReviewPanel from "@/components/TranscriptReviewPanel";
import { IconChevronLeft, IconSpeaker, IconSpeakerWave } from "@/components/ui/CyberIcons";
import { IconShell } from "@/components/ui/IconShell";
import { useAudioRecorder, type RecordMode } from "@/hooks/useAudioRecorder";
import { useCoachSessionUI } from "@/hooks/useCoachSessionUI";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  assessPronunciation,
  buildFallbackReport,
  endSession,
  initConversation,
  sendMessageStream,
  transcribeAudio,
  translateText,
} from "@/lib/api";
import {
  savePracticeDraft,
  savePracticeSession,
  sessionReportToDetail,
} from "@/lib/practiceHistoryStore";
import { AudioTransport } from "@/lib/audioTransport";
import { MOCK_SKILLS } from "@/lib/cockpitMockData";
import { getCoachPersona } from "@/lib/coachPersonas";
import { MOCK_COACH_MESSAGES } from "@/lib/mockCoachMessages";
import type { ChatItem } from "@/types/chat";
import type { Correction, Scene, SessionReport, TurnEventPayload } from "@/types/api";
import { DRAFT_AUTOSAVE_TURN_INTERVAL } from "@/types/history";

export type { ChatItem };

export type ExitOptions = {
  scrollToHistory?: boolean;
};

type Props = {
  sessionId: string;
  scene: Scene;
  startedAt: Date;
  onExit: (options?: ExitOptions) => void;
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
  const [reportDetail, setReportDetail] = useState<ReturnType<typeof sessionReportToDetail> | null>(
    null,
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const sessionSavedRef = useRef(false);
  const [correctionsLog, setCorrectionsLog] = useState<
    { user_utterance: string; correction: Correction }[]
  >([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<AudioTransport | null>(null);
  const turnCountRef = useRef(0);
  const pendingTranscriptRef = useRef<string | null>(null);
  const pendingAudioRef = useRef<{ blob: Blob; filename: string } | null>(null);
  const tts = useTextToSpeech();
  const playAssistantSpeech = useCallback(
    (text: string, messageId: string) => {
      tts.speak(text, { messageId });
    },
    [tts],
  );
  const speakRef = useRef(playAssistantSpeech);
  speakRef.current = playAssistantSpeech;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const attachTranslation = useCallback(
    (messageId: string, content: string) => {
      void translateText(content)
        .then((translationZh) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, translationZh } : m,
            ),
          );
          scrollToBottom();
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, translationZh: "（翻译加载失败，请确认后端已启动）" }
                : m,
            ),
          );
        });
    },
    [scrollToBottom],
  );

  const buildCurrentReport = useCallback((): SessionReport => {
    return buildFallbackReport(
      sessionId,
      scene,
      correctionsLog,
      turnCountRef.current,
      startedAt,
    );
  }, [sessionId, scene, correctionsLog, startedAt]);

  const maybeAutoDraft = useCallback(() => {
    const turns = turnCountRef.current;
    if (turns < 1 || sessionSavedRef.current) return;
    if (turns % DRAFT_AUTOSAVE_TURN_INTERVAL !== 0) return;
    savePracticeDraft(buildCurrentReport());
  }, [buildCurrentReport]);

  /** 处理 SSE 流式事件 — 打字机效果 + 纠错附加 */
  const applyStreamEvents = useCallback(
    async (generator: AsyncGenerator<TurnEventPayload>) => {
      let currentAssistantId: string | null = null;

      for await (const event of generator) {
        switch (event.kind) {
          case "user_message": {
            const msg = event.message;
            if (msg) {
              setMessages((prev) => [
                ...prev,
                {
                  id: event.message_id,
                  role: "user",
                  content: msg.content,
                },
              ]);
              scrollToBottom();
            }
            break;
          }

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
              const content = event.message.content;
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === event.message_id);
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    id: event.message_id,
                    role: "assistant",
                    content,
                  },
                ];
              });
              speakRef.current(content, event.message_id);
              attachTranslation(event.message_id, content);
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
    [scrollToBottom, attachTranslation],
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
        maybeAutoDraft();
      }
    },
    [applyStreamEvents, isProcessing, sessionId, maybeAutoDraft],
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
      maybeAutoDraft();
    }
  }, [applyStreamEvents, isProcessing, scrollToBottom, sessionId, transcriptReview, maybeAutoDraft]);

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

        let openingText = "";

        for (const ev of events) {
          if (ev.kind === "assistant_delta") {
            openingText += ev.delta ?? "";
            setStreamingId(ev.message_id);
            setStreamingText(openingText);
          }
          if (ev.kind === "assistant_done" && ev.message) {
            const content = ev.message.content;
            setMessages([
              {
                id: ev.message_id,
                role: "assistant",
                content,
              },
            ]);
            setStreamingId(null);
            setStreamingText("");
            speakRef.current(content, ev.message_id);
            attachTranslation(ev.message_id, content);
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
  }, [attachTranslation, initTransport, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (turnCountRef.current > 0 && !sessionSavedRef.current) {
        e.preventDefault();
        e.returnValue = "退出将不保存本次练习，是否确认？";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const handleEndSession = async () => {
    if (isEnding) return;
    setIsEnding(true);
    tts.stop();
    transportRef.current?.disconnect();

    let finalReport: SessionReport;
    try {
      const res = await endSession(sessionId);
      finalReport = res.report ?? buildCurrentReport();
    } catch {
      finalReport = buildCurrentReport();
    }

    savePracticeSession(finalReport);
    sessionSavedRef.current = true;
    setReportDetail(sessionReportToDetail(finalReport));
    setIsEnding(false);
  };

  const handleReportClose = () => {
    setReportDetail(null);
    onExit({ scrollToHistory: true });
  };

  const handleBackRequest = () => {
    if (turnCountRef.current > 0 && !sessionSavedRef.current) {
      setShowExitConfirm(true);
      return;
    }
    transportRef.current?.disconnect();
    onExit();
  };

  const confirmExitWithoutSave = () => {
    setShowExitConfirm(false);
    transportRef.current?.disconnect();
    onExit();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendText(textInput);
    setTextInput("");
  };

  const searchParams = useSearchParams();
  const isInsightDemo = searchParams.get("demo") === "insights";

  const isListening = recorder.isRecording;
  const isReviewing = transcriptReview !== null;
  const isBusy = isProcessing || isInitializing || isTranscribing;

  const coachPersona = useMemo(() => getCoachPersona(scene), [scene]);

  const { aiStatus, isUserSpeaking, hints } = useCoachSessionUI({
    isUserSpeaking: isListening,
    isAiSpeaking: tts.isSpeaking,
    isAiThinking: isProcessing || !!streamingId || isTranscribing,
    hints: coachPersona.hints,
  });

  const avatarStatusHint = isReviewing
    ? "请核对识别文字后发送"
    : isTranscribing
      ? "识别中，请稍候…"
      : isUserSpeaking
        ? "正在采集你的语音…"
        : undefined;

  const visibleMessages = isInsightDemo ? MOCK_COACH_MESSAGES : messages;

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

  const handleHintClick = useCallback((hint: string) => {
    setTextInput(hint);
  }, []);

  const assistantAudio = useMemo(
    () => ({
      sessionMessageId: tts.sessionMessageId,
      isAudioPlaying: tts.isAudioPlaying,
      isPaused: tts.isPaused,
      playbackState: tts.playbackState,
      audioProgress: tts.audioProgress,
      audioCurrentTime: tts.audioCurrentTime,
      audioDuration: tts.audioDuration,
      onSeek: tts.seekTo,
      onPause: tts.pause,
      onResume: tts.resume,
      onStop: tts.stopPlayback,
      onReplay: (messageId: string, text: string) => {
        playAssistantSpeech(text, messageId);
      },
    }),
    [
      tts.sessionMessageId,
      tts.isAudioPlaying,
      tts.isPaused,
      tts.playbackState,
      tts.audioProgress,
      tts.audioCurrentTime,
      tts.audioDuration,
      tts.seekTo,
      tts.pause,
      tts.resume,
      tts.stopPlayback,
      playAssistantSpeech,
    ],
  );

  return (
    <>
      <div className="relative flex h-screen flex-col overflow-hidden bg-[#0B0F19] text-slate-100">
        {/* 背景光晕 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        {/* 顶栏 — 背景对比代替硬分割线 */}
        <header className="relative z-20 flex shrink-0 items-center justify-between bg-[#0B0F19]/90 px-4 py-4 backdrop-blur-md">
          <IconShell size="lg" onClick={handleBackRequest} aria-label="返回" title="返回">
            <IconChevronLeft />
          </IconShell>
          <div className="text-center">
            <h1 className="font-bold text-slate-50">
              {scene.icon} {scene.name_zh}
            </h1>
            <p className="text-xs text-slate-500">{scene.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {tts.isSupported && (
              <IconShell
                size="lg"
                active={tts.enabled}
                onClick={tts.toggleEnabled}
                title={tts.enabled ? "关闭 AI 朗读" : "开启 AI 朗读"}
                aria-label={tts.enabled ? "关闭 AI 朗读" : "开启 AI 朗读"}
              >
                {tts.isSpeaking ? (
                  <IconSpeakerWave className="animate-pulse" />
                ) : (
                  <IconSpeaker />
                )}
              </IconShell>
            )}
            <button
              type="button"
              disabled={isEnding}
              onClick={() => void handleEndSession()}
              className="rounded-[14px] bg-indigo-950/30 px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-indigo-950/45 hover:text-slate-300 disabled:opacity-50"
            >
              {isEnding ? "生成报告…" : "结束"}
            </button>
          </div>
        </header>

        {/* 主内容：左 2/5 虚拟人 + 右 3/5 对话流 */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6">
          <aside className="flex w-full shrink-0 flex-col gap-5 p-4 lg:w-2/5 lg:p-6">
            <CoachAvatarPanel
              persona={coachPersona}
              aiStatus={aiStatus}
              sceneIcon={scene.icon}
              statusHint={avatarStatusHint}
            />
            <InteractiveRadarChart skills={MOCK_SKILLS} compact />
          </aside>

          {/* 右侧对话流 */}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-44 lg:pb-48">
            <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
              <div className="mx-auto max-w-2xl space-y-5">
                {isInsightDemo && (
                  <p className="mb-4 text-center text-[10px] uppercase tracking-widest text-slate-500">
                    Insight Demo — add ?demo=insights to URL
                  </p>
                )}

                {isInitializing && visibleMessages.length === 0 && !streamingText && (
                  <p className="text-center text-sm text-slate-500">AI 教练正在接入通话舱…</p>
                )}

                {visibleMessages.map((msg) => (
                  <CyberChatBubble
                    key={msg.id}
                    item={msg}
                    audio={msg.role === "assistant" ? assistantAudio : undefined}
                  />
                ))}

                {streamingId && (
                  <CyberChatBubble
                    item={{ id: streamingId, role: "assistant", content: "" }}
                    streamingText={streamingText}
                    isStreaming
                  />
                )}

                {transcriptReview !== null && (
                  <TranscriptReviewPanel
                    variant="dark"
                    text={transcriptReview}
                    asrEngine={asrEngine}
                    onChange={setTranscriptReview}
                    onConfirm={() => void confirmTranscriptReview()}
                    onCancel={cancelTranscriptReview}
                    disabled={isProcessing}
                  />
                )}

                <div ref={chatEndRef} />
              </div>
            </div>
          </main>
        </div>

        {/* 底部沉浸式控制栏 */}
        <CyberControlBar
          hints={hints}
          textInput={textInput}
          onTextChange={setTextInput}
          onSubmit={handleTextSubmit}
          onHintClick={handleHintClick}
          recordMode={recordMode}
          onRecordModeChange={setRecordMode}
          isUserSpeaking={isUserSpeaking}
          isBusy={isBusy}
          isReviewing={isReviewing}
          recorderSupported={recorder.isSupported}
          statusLabel={statusLabel}
          footerStatus={footerStatus}
          showMicSettings={showMicSettings}
          onToggleMicSettings={() => setShowMicSettings((v) => !v)}
          onMicDeviceChange={setMicDeviceId}
          onPressStart={handleRecordStart}
          onPressEnd={handleRecordEnd}
          onToggle={handleRecordToggle}
        />

        {!recorder.isSupported && (
          <p className="pointer-events-none fixed bottom-2 left-0 right-0 z-40 text-center text-[10px] text-slate-500">
            麦克风不可用，请用文字输入
          </p>
        )}
      </div>

      {reportDetail && (
        <ReportDetailModal
          report={reportDetail}
          onClose={handleReportClose}
          onRestart={() => {
            setReportDetail(null);
            onExit();
          }}
        />
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E1424] p-6 shadow-depth-lg">
            <h3 className="text-base font-bold text-slate-50">退出练习？</h3>
            <p className="mt-2 text-sm text-slate-400">
              退出将不保存本次练习至时光回溯。建议点击「结束」生成完整报告后再离开。
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm text-slate-400"
              >
                继续练习
              </button>
              <button
                type="button"
                onClick={confirmExitWithoutSave}
                className="flex-1 rounded-xl bg-rose-600/80 py-2.5 text-sm font-medium text-white"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
