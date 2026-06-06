const STORAGE_KEY = "scenespeak-mic-device-id";

export type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export function getStoredMicDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredMicDeviceId(deviceId: string): void {
  localStorage.setItem(STORAGE_KEY, deviceId);
}

/** 需至少成功调用过一次 getUserMedia，Chrome 才会返回设备名称 */
export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `麦克风 ${i + 1}`,
    }));
}
