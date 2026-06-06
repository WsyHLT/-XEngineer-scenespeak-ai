import type {
  Scene,
  SceneId,
  SceneListResponse,
  SessionReport,
  SessionStartResponse,
  TranscribeResponse,
  TurnEventPayload,
  PronunciationAssessment,
} from "@/types/api";

/** 默认走同源代理（next.config rewrites）；仅调试时设 NEXT_PUBLIC_API_URL */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchScenes(): Promise<Scene[]> {
  const data = await request<SceneListResponse>("/api/scenes");
  return data.scenes;
}

export async function startSession(sceneId: SceneId): Promise<SessionStartResponse> {
  return request<SessionStartResponse>("/api/session/start", {
    method: "POST",
    body: JSON.stringify({ scene_id: sceneId }),
  });
}

/** 解析 SSE 流，逐条 yield TurnEventPayload */
export async function* consumeSSE(
  path: string,
  body: Record<string, unknown>,
): AsyncGenerator<TurnEventPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 401 || detail.includes("api_key")) {
      throw new Error("后端 LLM API Key 未配置，请编辑 backend/.env 填入 OPENAI_API_KEY");
    }
    throw new Error(detail || `请求失败 HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error("SSE 响应为空");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const parsed = JSON.parse(raw) as TurnEventPayload | { error: string };
        if ("error" in parsed) throw new Error(parsed.error);
        yield parsed as TurnEventPayload;
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export async function transcribeAudio(
  blob: Blob,
  filename = "recording.webm",
): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("file", blob, filename);
  const res = await fetch(`${API_BASE}/api/chat/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: string };
      if (j.detail) detail = j.detail;
    } catch {
      // keep raw text
    }
    if (res.status === 404) {
      throw new Error(
        "STT 接口不存在 (404)：请重启后端 uvicorn app.main:app --reload --port 8000",
      );
    }
    throw new Error(detail || `STT failed HTTP ${res.status}`);
  }
  const data = (await res.json()) as TranscribeResponse;
  const text = (data.text ?? "").trim();
  if (!text || text.toLowerCase() === "none") {
    throw new Error("未识别到语音内容，请靠近麦克风清晰说英文");
  }
  return { ...data, text };
}

export async function assessPronunciation(
  blob: Blob,
  referenceText: string,
  filename = "recording.webm",
): Promise<PronunciationAssessment> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("reference_text", referenceText.trim());
  const res = await fetch(`${API_BASE}/api/chat/assess-pronunciation`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: string };
      if (j.detail) detail = j.detail;
    } catch {
      // keep
    }
    throw new Error(detail || `发音评测失败 HTTP ${res.status}`);
  }
  return res.json() as Promise<PronunciationAssessment>;
}

export async function synthesizeSpeech(
  text: string,
  timeoutMs = 8_000,
): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/chat/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = await res.text();
      try {
        const j = JSON.parse(detail) as { detail?: string };
        if (j.detail) detail = j.detail;
      } catch {
        // keep
      }
      throw new Error(detail || `TTS failed HTTP ${res.status}`);
    }
    return res.blob();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("TTS 请求超时，已切换浏览器朗读");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function initConversation(sessionId: string): Promise<TurnEventPayload[]> {
  const events: TurnEventPayload[] = [];
  for await (const event of consumeSSE("/api/chat/init", { session_id: sessionId })) {
    events.push(event);
  }
  return events;
}

export async function* sendMessageStream(
  sessionId: string,
  text: string,
): AsyncGenerator<TurnEventPayload> {
  yield* consumeSSE("/api/chat/message", { session_id: sessionId, text });
}

/** 根据会话纠错记录生成 Demo 课后报告（后端 report API 就绪后可替换） */
export function buildDemoReport(
  sessionId: string,
  scene: Scene,
  corrections: { user_utterance: string; correction: import("@/types/api").Correction }[],
  turnCount: number,
  startedAt: Date,
): SessionReport {
  const severityWeight = { minor: 1, moderate: 2, major: 3 } as const;
  const penalty = corrections.reduce(
    (sum, c) => sum + severityWeight[c.correction.severity],
    0,
  );
  const grammar = Math.max(40, Math.min(98, 92 - penalty * 4));
  const pronunciation = Math.max(50, Math.min(95, 88 - Math.floor(penalty / 2) * 3));
  const fluency = Math.max(45, Math.min(92, 85 - turnCount * 0.5));
  const vocabulary = Math.max(50, Math.min(90, 80 - penalty * 2));
  const overall = Math.round((grammar + pronunciation + fluency + vocabulary) / 4);

  const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

  return {
    session_id: sessionId,
    scene_id: scene.id,
    scene_name: scene.name_zh,
    scores: {
      pronunciation: Math.round(pronunciation),
      grammar: Math.round(grammar),
      fluency: Math.round(fluency),
      vocabulary: Math.round(vocabulary),
      overall,
    },
    corrections: corrections.map((c, i) => ({
      message_id: `local-${i}`,
      turn_index: i + 1,
      user_utterance: c.user_utterance,
      correction: c.correction,
    })),
    suggestions: [
      {
        area: "grammar",
        current_score: Math.round(grammar),
        target_score: Math.min(95, Math.round(grammar) + 15),
        suggestion: "练习使用正确的时态和介词搭配，录音后复述修正句。",
        priority: grammar < 75 ? 1 : 3,
      },
      {
        area: "expression",
        current_score: Math.round(vocabulary),
        target_score: Math.min(92, Math.round(vocabulary) + 12),
        suggestion: "积累场景地道表达，替换中式英语说法。",
        priority: 2,
      },
    ],
    summary:
      corrections.length === 0
        ? "本次练习表现优秀，表达流畅且语法准确，继续保持！"
        : `共完成 ${turnCount} 轮对话，发现 ${corrections.length} 处可改进表达。重点关注语法准确性，多使用地道说法。`,
    highlights:
      corrections.length < 3
        ? ["对话参与度 high", "能完成场景核心任务"]
        : ["勇于开口表达", "基本完成场景对话"],
    total_turns: turnCount,
    duration_seconds: durationSeconds,
    generated_at: new Date().toISOString(),
  };
}

export { API_BASE };
