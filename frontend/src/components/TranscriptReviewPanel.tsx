"use client";

type Props = {
  text: string;
  asrEngine?: string | null;
  onChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  variant?: "light" | "dark";
};

const ENGINE_LABEL: Record<string, string> = {
  bailian: "百炼 Qwen-ASR",
  sensevoice: "SenseVoice",
  dashscope: "百炼 Paraformer",
  openai: "Whisper",
  groq: "Groq Whisper",
};

export default function TranscriptReviewPanel({
  text,
  asrEngine,
  onChange,
  onConfirm,
  onCancel,
  disabled = false,
  variant = "light",
}: Props) {
  const dark = variant === "dark";
  const engineLabel = asrEngine ? ENGINE_LABEL[asrEngine] ?? asrEngine : null;
  const rows = Math.min(8, Math.max(3, Math.ceil(text.length / 52) + 1));

  return (
    <div
      className={`mb-4 w-full rounded-xl border p-4 shadow-sm ${
        dark
          ? "border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md"
          : "border-indigo-200 bg-indigo-50/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={`text-xs font-medium ${dark ? "text-indigo-300" : "text-indigo-700"}`}>
          识别结果（英文）· 请核对，有误可直接修改
        </p>
        {engineLabel && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              dark ? "bg-white/10 text-indigo-300" : "bg-white/80 text-indigo-600"
            }`}
          >
            ASR: {engineLabel}
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={`max-h-48 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50 ${
          dark
            ? "border-white/10 bg-black/30 text-slate-100 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            : "border-indigo-200 bg-white text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        }`}
        aria-label="语音识别结果，可编辑"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            dark ? "text-slate-400 hover:bg-white/5" : "text-slate-600 hover:bg-white/80"
          }`}
        >
          取消重录
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || !text.trim()}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-neon disabled:opacity-50"
        >
          确认发送
        </button>
      </div>
    </div>
  );
}
