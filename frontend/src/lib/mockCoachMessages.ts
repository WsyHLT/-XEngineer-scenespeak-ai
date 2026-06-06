import type { ChatItem } from "@/types/chat";

/** 带 Grammar Fix + Better Alternative 的示例对话 — 用于 ?demo=insights 预览 */
export const MOCK_COACH_MESSAGES: ChatItem[] = [
  {
    id: "mock-a1",
    role: "assistant",
    content:
      "Great to meet you! Let's start with a classic interview opener — tell me about a challenge you faced at work and how you handled it.",
    translationZh:
      "很高兴见到你！我们从经典面试题开始——说说你在工作中遇到的一个挑战，以及你是如何处理的。",
  },
  {
    id: "mock-u1",
    role: "user",
    content: "I have handle a difficult project last year when our team was very busy.",
    insight: {
      grammarFix: {
        original: "have handle",
        corrected: "handled",
      },
      betterAlternative:
        "Last year, I took ownership of a high-pressure project when our team was operating at full capacity.",
      explanation: "Use simple past for a completed event; lead with impact for interview context.",
    },
  },
  {
    id: "mock-a2",
    role: "assistant",
    content:
      "That's a solid start. Could you walk me through the specific steps you took to keep the project on track?",
    translationZh:
      "这是个不错的开头。能具体说说你采取了哪些步骤来确保项目按计划推进吗？",
  },
  {
    id: "mock-u2",
    role: "user",
    content: "I make sure everyone know the deadline and we meeting everyday.",
    insight: {
      grammarFix: {
        original: "make / know / meeting",
        corrected: "made / knew / met",
      },
      betterAlternative:
        "I ensured everyone was aligned on the deadline and we held daily stand-ups to surface blockers early.",
      explanation: "Past tense narrative; 'stand-ups' fits a professional meeting scenario.",
    },
  },
  {
    id: "mock-u3",
    role: "user",
    content: "I'm not entirely sure, but I think we can finish before Friday if nothing go wrong.",
    insight: {
      grammarFix: {
        original: "go",
        corrected: "goes",
      },
      betterAlternative:
        "I'm not entirely sure, but barring any unforeseen issues, we should be able to deliver by Friday.",
    },
  },
];
