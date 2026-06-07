import { STORAGE_KEY } from "@/lib/storageKeys";

export const HISTORY_CHANGED_EVENT = "scenespeak:history-changed";

export type HistoryChangedDetail = {
  source: "save" | "draft" | "delete" | "clear" | "migrate";
};

/** 同页广播 — storage 事件仅在跨标签页触发 */
export function dispatchHistoryChanged(detail: HistoryChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<HistoryChangedDetail>(HISTORY_CHANGED_EVENT, { detail }),
  );
}

export function subscribeHistoryChanged(
  handler: (detail: HistoryChangedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onCustom = (e: Event) => {
    handler((e as CustomEvent<HistoryChangedDetail>).detail);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      handler({ source: "save" });
    }
  };

  window.addEventListener(HISTORY_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HISTORY_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
