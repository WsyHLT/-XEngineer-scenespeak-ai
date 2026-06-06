"use client";

type Props = {
  text: string;
  asrEngine?: string | null;
  onChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
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
}: Props) {
  const engineLabel = asrEngine ? ENGINE_LABEL[asrEngine] ?? asrEngine : null;
  const rows = Math.min(8, Math.max(3, Math.ceil(text.length / 52) + 1));

  return (
    <div className="mb-4 w-full rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-indigo-700">
          识别结果（英文）· 请核对，有误可直接修改
        </p>
        {engineLabel && (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
            ASR: {engineLabel}
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="max-h-48 w-full resize-y rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
        aria-label="语音识别结果，可编辑"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/80 disabled:opacity-50"
        >
          取消重录
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled || !text.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          确认发送
        </button>
      </div>
    </div>
  );
}
