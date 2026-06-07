"use client";

import { useState } from "react";

import AiAudioController from "@/components/chat/AiAudioController";
import FloatingInsightPanel from "@/components/chat/FloatingInsightPanel";
import PronunciationBubble from "@/components/PronunciationBubble";
import Squircle from "@/components/ui/Squircle";
import { resolveChatInsight } from "@/lib/chatInsightUtils";
import { FONT_DATA } from "@/lib/designSystem";
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
          <div className="rounded-2xl rounded-br-md bg-violet-950/35 px-4 py-3 shadow-depth backdrop-blur-md">
            <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-slate-50">
              {content}
            </p>
          </div>
          {insight && <FloatingInsightPanel insight={insight} />}
          {item.pronunciation && (
            <div className="mt-2 [&_*]:bg-white/[0.04] [&_*]:text-slate-400">
              <PronunciationBubble assessment={item.pronunciation} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <Squircle
        size="sm"
        className="mt-1 bg-gradient-to-br from-indigo-600/90 to-violet-700/90 shadow-depth"
      >
        <span className={`${FONT_DATA} text-[10px] font-bold text-slate-50`}>AI</span>
      </Squircle>
      <div className="max-w-[92%]">
        <div className="rounded-2xl rounded-bl-md bg-indigo-950/35 px-4 py-3 shadow-depth backdrop-blur-md">
          <p className="whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-slate-50">
            {content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-300/80 align-middle" />
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
