"use client";

import { useCallback, useEffect, useState } from "react";

export type MicPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export function useMicPermission() {
  const [state, setState] = useState<MicPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const check = useCallback(async () => {
    if (!isSupported) {
      setState("unsupported");
      return false;
    }
    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      if (status.state === "granted") setState("granted");
      else if (status.state === "denied") setState("denied");
      else setState("prompt");
      return status.state === "granted";
    } catch {
      setState("prompt");
      return false;
    }
  }, [isSupported]);

  const request = useCallback(async () => {
    if (!isSupported) {
      setState("unsupported");
      setError("浏览器不支持麦克风");
      return false;
    }
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState("granted");
      return true;
    } catch (e) {
      setState("denied");
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "麦克风权限被拒绝，请点击地址栏左侧锁图标 → 允许麦克风"
          : "无法访问麦克风",
      );
      return false;
    }
  }, [isSupported]);

  useEffect(() => {
    void check();
  }, [check]);

  return { state, error, isSupported, check, request };
}
