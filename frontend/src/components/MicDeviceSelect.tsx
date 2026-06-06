"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getStoredMicDeviceId,
  listAudioInputDevices,
  setStoredMicDeviceId,
  type AudioInputDevice,
} from "@/lib/micDevices";

type Props = {
  onDeviceChange?: (deviceId: string | null) => void;
};

export default function MicDeviceSelect({ onDeviceChange }: Props) {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [needsPermission, setNeedsPermission] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listAudioInputDevices();
    setDevices(list);
    const hasLabels = list.some((d) => d.label && !d.label.startsWith("麦克风 "));
    setNeedsPermission(!hasLabels && list.length > 0);

    const stored = getStoredMicDeviceId();
    if (stored && list.some((d) => d.deviceId === stored)) {
      setSelected(stored);
      onDeviceChange?.(stored);
    } else if (list.length === 1) {
      setSelected(list[0].deviceId);
      onDeviceChange?.(list[0].deviceId);
    }
  }, [onDeviceChange]);

  useEffect(() => {
    void refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, [refresh]);

  const unlockLabels = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch {
      // 权限被拒时由上层提示
    }
  };

  const handleChange = (deviceId: string) => {
    setSelected(deviceId);
    if (deviceId) setStoredMicDeviceId(deviceId);
    onDeviceChange?.(deviceId || null);
  };

  if (devices.length === 0) {
    return (
      <button
        type="button"
        onClick={() => void unlockLabels()}
        className="text-[11px] text-indigo-600 underline hover:text-indigo-800"
      >
        点击授权麦克风
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="shrink-0">输入设备</span>
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
        >
          <option value="">系统默认</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {needsPermission && (
        <button
          type="button"
          onClick={() => void unlockLabels()}
          className="text-left text-[10px] text-amber-600 underline"
        >
          设备名称未显示？点此授权后 F5 刷新
        </button>
      )}
    </div>
  );
}
