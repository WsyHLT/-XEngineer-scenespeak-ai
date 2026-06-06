"use client";

import type { ChatItem } from "@/types/chat";
import CorrectionBubble from "@/components/CorrectionBubble";
import PronunciationBubble from "@/components/PronunciationBubble";

type Props = {
  item: ChatItem;
  streamingText?: string;
  isStreaming?: boolean;
};

export default function ChatBubble({ item, streamingText, isStreaming }: Props) {
  const isUser = item.role === "user";
  const content = isStreaming && streamingText !== undefined ? streamingText : item.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "order-1" : ""}`}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs">
              AI
            </span>
            <span className="text-xs text-slate-400">Coach</span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "rounded-br-md bg-indigo-600 text-white"
              : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100"
          }`}
        >
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400 align-middle" />
            )}
          </p>
        </div>

        {/* 纠错气泡：单独展示在用户消息下方，不混入 AI 对话流 */}
        {isUser && item.pronunciation && (
          <PronunciationBubble assessment={item.pronunciation} />
        )}

        {isUser && item.correction && item.correction.correction_type !== "pronunciation" && (
          <CorrectionBubble correction={item.correction} />
        )}
      </div>
    </div>
  );
}
