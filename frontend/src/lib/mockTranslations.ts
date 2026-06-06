/** Mock 中文翻译 — 后续可替换为翻译 API */
const MOCK_MAP: Record<string, string> = {
  "Great to meet you! Let's start with a classic interview opener — tell me about a challenge you faced at work and how you handled it.":
    "很高兴见到你！我们从经典面试题开始——说说你在工作中遇到的一个挑战，以及你是如何处理的。",
  "That's a solid start. Could you walk me through the specific steps you took to keep the project on track?":
    "这是个不错的开头。能具体说说你采取了哪些步骤来确保项目按计划推进吗？",
};

export function mockTranslateAssistant(text: string): string {
  const trimmed = text.trim();
  if (MOCK_MAP[trimmed]) return MOCK_MAP[trimmed];
  if (trimmed.length < 12) return trimmed;
  return `（译文预览）${trimmed.slice(0, 48)}${trimmed.length > 48 ? "…" : ""}`;
}
