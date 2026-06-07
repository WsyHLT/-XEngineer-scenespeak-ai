"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "info" | "error";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = ++toastSeq;
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m) => push(m, "success"),
      info: (m) => push(m, "info"),
      error: (m) => push(m, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-in fade-in slide-in-from-bottom-2 rounded-[14px] px-4 py-2.5 text-sm shadow-depth-lg backdrop-blur-md ${
              t.variant === "success"
                ? "bg-emerald-950/85 text-emerald-100"
                : t.variant === "error"
                  ? "bg-rose-950/85 text-rose-100"
                  : "bg-indigo-950/85 text-indigo-100"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** 非 React 环境（如 store）调用的简易 toast 桥 */
export function toastSuccess(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("scenespeak:toast", { detail: { message, variant: "success" } }),
  );
}

export function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, variant } = (e as CustomEvent<{ message: string; variant: ToastVariant }>)
        .detail;
      if (variant === "success") toast.success(message);
      else if (variant === "error") toast.error(message);
      else toast.info(message);
    };
    window.addEventListener("scenespeak:toast", handler);
    return () => window.removeEventListener("scenespeak:toast", handler);
  }, [toast]);
  return null;
}
