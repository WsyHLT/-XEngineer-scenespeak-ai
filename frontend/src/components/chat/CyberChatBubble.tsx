"use client";

import { useState } from "react";

import AiAudioController from "@/components/chat/AiAudioController";
import FloatingInsightPanel from "@/components/chat/FloatingInsightPanel";
import PronunciationBubble from "@/components/PronunciationBubble";
import { resolveChatInsight } from "@/lib/chatInsightUtils";
import type { ChatItem } from "@/types/chat";

export type AssistantAudioProps = {
  sessionMessageId: string | null;
  isAudioPlaying: boolean;
  isPaused: boolean;
  playbackState: "idle" | "playing" | "paused" | "stopped" | "ended";
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  onSeek: (ratio: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReplay: (messageId: string, text: string) => void;
};

type Props = {
  item: ChatItem;
  streamingText?: string;
  isStreaming?: boolean;
  audio?: AssistantAudioProps;
};

export default function CyberChatBubble({
  item,
  streamingText,
  isStreaming,
  audio,
}: Props) {
  const isUser = item.role === "user";
  const content = isStreaming && streamingText !== undefined ? streamingText : item.content;
  const insight = isUser ? resolveChatInsight(item) : undefined;
  const [showTranslation, setShowTranslation] = useState(false);

  const isSessionMessage = audio?.sessionMessageId === item.id;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%]">
          <div className="rounded-2xl rounded-br-md border border-purple-500/20 bg-purple-950/40 px-4 py-3 shadow-[0_0_24px_rgba(168,85,247,0.12)] backdrop-blur-md">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-purple-50/95">
              {content}
            </p>
          </div>
          {insight && <FloatingInsightPanel insight={insight} />}
          {item.pronunciation && (
            <div className="mt-2 [&_*]:border-white/10 [&_*]:bg-white/[0.04] [&_*]:text-slate-200">
              <PronunciationBubble assessment={item.pronunciation} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-gradient-to-br from-blue-600/80 to-indigo-700/80 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]">
        AI
      </div>
      <div className="max-w-[92%]">
        <div className="rounded-2xl rounded-bl-md border border-blue-500/20 bg-blue-950/40 px-4 py-3 shadow-[0_0_20px_rgba(59,130,246,0.1)] backdrop-blur-md">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sky-100/95">
            {content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-400 align-middle shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
            )}
          </p>

          {!isStreaming && content && audio && (
            <AiAudioController
              isSessionMessage={isSessionMessage}
              isAudioPlaying={isSessionMessage && audio.isAudioPlaying}
              isPaused={isSessionMessage && audio.isPaused}
              playbackState={isSessionMessage ? audio.playbackState : "idle"}
              audioProgress={isSessionMessage ? audio.audioProgress : 0}
              audioCurrentTime={isSessionMessage ? audio.audioCurrentTime : 0}
              audioDuration={isSessionMessage ? audio.audioDuration : 0}
              showTranslation={showTranslation}
              translationZh={item.translationZh}
              onToggleTranslation={() => setShowTranslation((v) => !v)}
              onSeek={audio.onSeek}
              onPause={audio.onPause}
              onResume={audio.onResume}
              onStop={audio.onStop}
              onReplay={() => audio.onReplay(item.id, content)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
