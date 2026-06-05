import type { Correction } from "@/types/api";

export type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  correction?: Correction;
};
