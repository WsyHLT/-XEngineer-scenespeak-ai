/** 检测录音 Blob 是否含有效人声能量（避免上传静音 webm） */

const MIN_SPEECH_RMS = 0.006;

export { MIN_SPEECH_RMS };

export async function measureBlobRms(blob: Blob): Promise<number | null> {
  if (blob.size < 200) return null;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const channel = audioBuffer.getChannelData(0);
      if (channel.length === 0) return null;
      let sum = 0;
      for (let i = 0; i < channel.length; i++) {
        const s = channel[i];
        sum += s * s;
      }
      return Math.sqrt(sum / channel.length);
    } finally {
      await ctx.close();
    }
  } catch {
    // webm 解码失败时不阻断上传，由后端 ASR 兜底
    return null;
  }
}

export function isLikelySilent(rms: number | null): boolean {
  return rms !== null && rms < MIN_SPEECH_RMS;
}
