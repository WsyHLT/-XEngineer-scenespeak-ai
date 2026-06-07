"use strict";

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");
const WebSocket = require("ws");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  apiUrl: process.env.AI_API_URL || "https://api.deepseek.com/chat/completions",
  defaultModel: process.env.AI_MODEL || "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "",
  maxRetries: 3,
  timeout: 30000,
  maxMessageLength: 1000,
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // requests per window
  tencentAppId: process.env.TENCENT_SOE_APPID || process.env.TENCENTCLOUD_APPID || "",
  tencentSecretId: process.env.TENCENTCLOUD_SECRET_ID || process.env.TENCENT_SECRET_ID || "",
  tencentSecretKey: process.env.TENCENTCLOUD_SECRET_KEY || process.env.TENCENT_SECRET_KEY || "",
  tencentSoeWsEndpoint: process.env.TENCENT_SOE_WS_ENDPOINT || "wss://soe.cloud.tencent.com/soe/api",
  tencentSoeEndpoint: process.env.TENCENT_SOE_ENDPOINT || "https://soe.tencentcloudapi.com",
  tencentSoeRegion: process.env.TENCENT_SOE_REGION || "ap-guangzhou"
};

const OPEN_PRONOUNCE_DIR = process.env.OPEN_PRONOUNCE_DIR ||
  path.resolve(__dirname, "../../OpenPronounce-main/OpenPronounce-main");

const SCENARIOS = {
  "job-interview": {
    name: "面试",
    role: "You are an interviewer. Ask focused follow-up questions about experience, projects, strengths, weaknesses, and career goals.",
    starter: "Let’s start the interview practice. Please introduce yourself and tell me why you are interested in this role."
  },
  restaurant: {
    name: "点餐",
    role: "You are a restaurant server. Help the learner order food, ask about preferences, and handle polite dining conversations.",
    starter: "Let's start the ordering practice.Welcome. Are you ready to order, or would you like a recommendation first?"
  },
  meeting: {
    name: "会议",
    role: "You are a meeting colleague. Practice agenda discussion, clarification, agreement, disagreement, and action items.",
    starter: "Let's start the meeting practice.Could you give a quick update on your current progress?"
  },
  travel: {
    name: "旅行",
    role: "You are a travel service agent. Practice airport, hotel, directions, and itinerary conversations.",
    starter: "Let's start the travel scenario practice. How can I help with your trip today?"
  },
  shopping: {
    name: "购物",
    role: "You are a shop assistant. Practice asking about products, prices, sizes, and returns.",
    starter: "Let's start the shopping scenario practice.Hi there. What are you looking for today?"
  },
  social: {
    name: "社交",
    role: "You are a friendly conversation partner. Practice small talk, opinions, follow-up questions, and natural turn-taking.",
    starter: "Let's start the social chat practiceNice to meet you. How has your day been so far?"
  }
};

// Personality system prompts - Enhanced for English Learning
const PERSONALITY_PROMPTS = {
  // English Tutor Personalities
  grammar_tutor: `You are an expert English grammar tutor. Your role is to:
- Listen carefully to the user's speech and identify grammar errors
- Provide clear, constructive corrections with explanations
- Explain grammar rules in simple, understandable terms
- Encourage the user while pointing out areas for improvement
- Give specific examples of correct usage
- Be patient and supportive in your feedback
Format your response as: [FEEDBACK] for corrections, [EXPLANATION] for grammar rules, [EXAMPLE] for examples.`,

  pronunciation_coach: `You are a professional English pronunciation coach. Your role is to:
- Analyze the user's speech for pronunciation issues
- Provide specific feedback on word pronunciation
- Suggest mouth positioning and breathing techniques
- Break down difficult words syllable by syllable
- Encourage proper rhythm and intonation
- Give practical tips for accent reduction
Format your response with [PRONUNCIATION] for specific word feedback, [TIP] for techniques, [PRACTICE] for exercises.`,

  conversation_partner: `You are a friendly English conversation partner. Your role is to:
- Engage in natural, flowing conversations
- Ask follow-up questions to encourage more speaking
- Gently correct errors without interrupting the flow
- Introduce new vocabulary naturally in context
- Adapt your language level to match the user's ability
- Create a comfortable, encouraging environment for practice
Keep conversations natural while providing subtle learning opportunities.`,

  vocabulary_builder: `You are an English vocabulary specialist. Your role is to:
- Introduce new words naturally in conversation
- Explain word meanings with clear definitions and examples
- Teach synonyms, antonyms, and word families
- Show how words are used in different contexts
- Help with collocations and common phrases
- Build the user's active vocabulary through practice
Format responses with [VOCABULARY] for new words, [CONTEXT] for usage examples, [PRACTICE] for exercises.`,

  fluency_coach: `You are an English fluency coach focused on speaking confidence. Your role is to:
- Encourage natural speaking rhythm and flow
- Help reduce hesitations and filler words
- Provide confidence-building exercises
- Teach linking words and smooth transitions
- Focus on natural speech patterns
- Celebrate improvements and progress
- Create speaking challenges appropriate to the user's level
Emphasize building confidence and natural speech flow.`,

  // Original personalities (kept for backward compatibility)
  helpful: "You are a helpful and friendly AI assistant. Provide clear, accurate, and useful responses.",
  creative: "You are a creative and imaginative AI assistant. Think outside the box and provide innovative, artistic responses.",
  technical: "You are a technical expert AI assistant. Provide detailed, accurate technical information with examples and best practices.",
  casual: "You are a casual, friendly AI assistant. Respond in a relaxed, conversational tone like talking to a good friend.",
  professional: "You are a professional AI assistant. Provide formal, well-structured responses suitable for business contexts."
};

// Middleware setup
app.use(helmet({
  hsts: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      upgradeInsecureRequests: null
    }
  }
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: CONFIG.rateLimitWindow,
  max: CONFIG.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(CONFIG.rateLimitWindow / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Static file serving
app.use(express.static(__dirname + "/views")); // HTML
app.use(express.static(__dirname + "/public")); // JS, CSS

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('./package.json').version
  });
});

// API endpoints
app.get('/api/models', (req, res) => {
  const availableModels = [
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'openai/gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' }
  ];
  res.json(availableModels);
});

app.get('/api/personalities', (req, res) => {
  const personalities = Object.keys(PERSONALITY_PROMPTS).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    description: PERSONALITY_PROMPTS[key]
  }));
  res.json(personalities);
});

app.get('/api/scenarios', (req, res) => {
  res.json(Object.entries(SCENARIOS).map(([id, scenario]) => ({
    id,
    name: scenario.name,
    starter: scenario.starter
  })));
});

app.post('/api/pronunciation-evaluate', async (req, res) => {
  const startedAt = Date.now();
  const { audioBase64, expectedText = "", transcript = "" } = req.body || {};

  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  try {
    const result = await runPronunciationAnalysis(audioBase64, expectedText || transcript);
    res.json({
      ...result,
      source: result.source || "openpronounce",
      processingTime: Date.now() - startedAt
    });
  } catch (error) {
    console.warn("Pronunciation analysis fallback:", error.message);
    res.json({
      ...buildFallbackPronunciation(transcript || expectedText, error.message),
      source: "fallback",
      processingTime: Date.now() - startedAt
    });
  }
});

app.post('/api/session-summary', async (req, res) => {
  const summary = generateSessionSummary(req.body || {});
  res.json(summary);
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

function decodeAudioBase64(audioBase64) {
  const clean = audioBase64.includes(",") ? audioBase64.split(",").pop() : audioBase64;
  return Buffer.from(clean, "base64");
}

function hasTencentSoeConfig() {
  return Boolean(CONFIG.tencentSecretId && CONFIG.tencentSecretKey);
}

function hasTencentSoeNewConfig() {
  return Boolean(CONFIG.tencentAppId && CONFIG.tencentSecretId && CONFIG.tencentSecretKey);
}

async function runTencentSoeNewEvaluation(audioBase64, expectedText) {
  const audioBuffer = getTencentPcmAudioBuffer(decodeAudioBase64(audioBase64));
  const refText = normalizeSoeRefText(expectedText);
  const voiceId = "soe-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex");
  const url = buildTencentSoeNewUrl(refText, voiceId);
  const response = await sendTencentSoeNewAudio(url, audioBuffer);
  return normalizeTencentSoeNewResult(response, refText, voiceId);
}

function getTencentPcmAudioBuffer(buffer) {
  if (buffer.length > 44 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WAVE") {
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.slice(offset, offset + 4).toString("ascii");
      const chunkSize = buffer.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      if (chunkId === "data") {
        return buffer.slice(dataStart, dataStart + chunkSize);
      }
      offset = dataStart + chunkSize;
    }
    return buffer.slice(44);
  }
  return buffer;
}

function buildTencentSoeNewUrl(refText, voiceId) {
  const base = CONFIG.tencentSoeWsEndpoint.replace(/\/$/, "") + "/" + CONFIG.tencentAppId;
  const host = new URL(base).host;
  const path = new URL(base).pathname;
  const now = Math.floor(Date.now() / 1000);
  const params = {
    secretid: CONFIG.tencentSecretId,
    timestamp: now,
    expired: now + 3600,
    nonce: Math.floor(Math.random() * 1000000000),
    server_engine_type: "16k_en",
    voice_id: voiceId,
    voice_format: 0,
    text_mode: 0,
    ref_text: refText,
    eval_mode: 1,
    score_coeff: 3.0,
    sentence_info_enabled: 1,
    rec_mode: 0,
    work_mode: 0
  };
  const sortedKeys = Object.keys(params).sort();
  const queryForSign = sortedKeys.map(key => key + "=" + params[key]).join("&");
  const signText = host + path + "?" + queryForSign;
  const signature = crypto.createHmac("sha1", CONFIG.tencentSecretKey).update(signText, "utf8").digest("base64");
  const query = sortedKeys
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(String(params[key])))
    .concat("signature=" + encodeURIComponent(signature))
    .join("&");
  return base + "?" + query;
}

function sendTencentSoeNewAudio(url, audioBuffer) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { perMessageDeflate: false });
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("Tencent SOE new WebSocket timed out"));
    }, 45000);
    let latestResponse = null;
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch (closeError) {}
      error ? reject(error) : resolve(result);
    };

    ws.on("open", async () => {
      try {
        const chunkSize = 1280;
        for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(audioBuffer.slice(offset, Math.min(offset + chunkSize, audioBuffer.length)));
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "end" }));
        }
      } catch (error) {
        finish(error);
      }
    });

    ws.on("message", data => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return;
      }
      const code = Number(parsed.code ?? parsed.error_code ?? parsed.errcode ?? 0);
      if (code && code !== 0) {
        finish(new Error((parsed.message || parsed.err_msg || "Tencent SOE new error") + " (code " + code + ")"));
        return;
      }
      if (parsed.result || parsed.score || parsed.SuggestedScore) {
        latestResponse = parsed;
      }
      if (parsed.final === 1 || parsed.is_final === 1 || parsed.type === "final") {
        finish(null, latestResponse || parsed);
      }
    });

    ws.on("error", error => finish(error));
    ws.on("close", () => {
      if (!settled && latestResponse) finish(null, latestResponse);
      else if (!settled) finish(new Error("Tencent SOE new WebSocket closed without result"));
    });
  });
}

function parseSoeNewResult(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    const obj = {};
    const fields = ["SuggestedScore", "PronAccuracy", "PronFluency", "PronCompletion", "PronProsody"];
    for (const field of fields) {
      const match = value.match(new RegExp(field + ":(-?\d+(?:\.\d+)?)"));
      if (match) obj[field] = Number(match[1]);
    }
    const words = [];
    const wordRegex = /ReferenceWord:([^\s}]+)|Word:([^\s}]+)/g;
    let match;
    while ((match = wordRegex.exec(value))) {
      const word = match[1] || match[2];
      if (word && !words.some(item => item.Word === word)) words.push({ Word: word });
    }
    if (words.length) obj.Words = words;
    return Object.keys(obj).length ? obj : null;
  }
}

function normalizeTencentSoeNewResult(response, refText, voiceId) {
  const result = parseSoeNewResult(response.result) || response.result || response;
  const wordResults = Array.isArray(result.words) ? result.words :
    Array.isArray(result.Words) ? result.Words :
    Array.isArray(result.word_score_list) ? result.word_score_list : [];
  const score = pickNumeric(result.suggested_score, result.SuggestedScore, result.pron_accuracy, result.PronAccuracy, result.score, 0);
  const accuracy = normalizePercentMetric(pickNumeric(result.pron_accuracy, result.PronAccuracy, result.accuracy_score, score));
  const fluency = normalizePercentMetric(pickNumeric(result.pron_fluency, result.PronFluency, result.fluency_score, 0));
  const completion = normalizePercentMetric(pickNumeric(result.pron_completion, result.PronCompletion, result.integrity_score, result.completion_score, 0));
  const prosody = normalizePercentMetric(pickNumeric(result.pron_prosody, result.PronProsody, result.prosody_score, 0));
  const problemWords = wordResults
    .map(item => ({
      word: item.word || item.Word || item.mem_word || item.MemWord || item.reference_word,
      score: pickNumeric(item.pron_accuracy, item.PronAccuracy, item.suggested_score, item.SuggestedScore, item.score, 0),
      phoneme: item.phone_info || item.PhoneInfo || item.phoneme || null
    }))
    .filter(item => item.word && item.score > 0 && item.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  return {
    score: Math.round(score),
    transcript: result.sentence || result.Sentence || result.text || result.Text || refText,
    feedback: buildTencentFeedback(score, accuracy, fluency, completion, problemWords),
    errors: problemWords,
    metrics: {
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      completion: Math.round(completion),
      prosody: Math.round(prosody)
    },
    raw: {
      voiceId,
      code: response.code,
      message: response.message
    },
    source: "tencent-soe-new"
  };
}

async function runTencentPronunciationEvaluation(audioBase64, expectedText) {
  if (hasTencentSoeNewConfig()) {
    try {
      return await runTencentSoeNewEvaluation(audioBase64, expectedText);
    } catch (error) {
      console.warn("Tencent SOE new WebSocket evaluation failed, trying legacy API:", error.message);
    }
  }


  const audioBuffer = decodeAudioBase64(audioBase64);
  const refText = normalizeSoeRefText(expectedText);
  const sessionId = "soe-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex");
  const payload = {
    SeqId: 1,
    IsEnd: 1,
    VoiceFileType: 2,
    VoiceEncodeType: 1,
    UserVoiceData: audioBuffer.toString("base64"),
    SessionId: sessionId,
    RefText: refText,
    WorkMode: 1,
    EvalMode: 1,
    ScoreCoeff: 3.0,
    ServerType: 0
  };

  let response = await callTencentSoe("TransmitOralProcessWithInit", payload);
  if (response.Status === "Evaluating") {
    response = await pollTencentSoeResult(sessionId);
  }

  if (response.Error) {
    throw new Error(response.Error.Message || response.Error.Code || "Tencent SOE error");
  }

  return normalizeTencentPronunciationResult(response, refText);
}

function normalizeSoeRefText(text) {
  const cleaned = String(text || "Please speak naturally.")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 30);
  return words.join(" ") || "Please speak naturally.";
}

async function pollTencentSoeResult(sessionId) {
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 700));
    const response = await callTencentSoe("TransmitOralProcess", {
      SeqId: 1,
      IsEnd: 1,
      IsQuery: 1,
      SessionId: sessionId,
      WorkMode: 1
    });
    if (response.Status !== "Evaluating") {
      return response;
    }
  }
  throw new Error("Tencent SOE evaluation timed out");
}

async function callTencentSoe(action, payload) {
  const endpoint = CONFIG.tencentSoeEndpoint;
  const host = new URL(endpoint).host;
  const service = "soe";
  const version = "2018-07-24";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const hashedRequestPayload = sha256Hex(body);
  const canonicalHeaders = "content-type:application/json\nhost:" + host + "\n";
  const signedHeaders = "content-type;host";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join("\n");
  const credentialScope = date + "/" + service + "/tc3_request";
  const stringToSign = [
    "TC3-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const secretDate = hmac("TC3" + CONFIG.tencentSecretKey, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = "TC3-HMAC-SHA256 Credential=" + CONFIG.tencentSecretId + "/" + credentialScope +
    ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

  const response = await axios.post(endpoint, body, {
    timeout: 30000,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Host: host,
      "X-TC-Action": action,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": version,
      "X-TC-Region": CONFIG.tencentSoeRegion
    }
  });

  const data = response.data && response.data.Response ? response.data.Response : response.data;
  if (data && data.Error) {
    throw new Error(data.Error.Code + ": " + data.Error.Message);
  }
  return data || {};
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function normalizeTencentPronunciationResult(response, refText) {
  const wordResults = Array.isArray(response.Words) ? response.Words : [];
  const sentenceScores = Array.isArray(response.SentenceInfoSet) ? response.SentenceInfoSet : [];
  const firstSentence = sentenceScores[0] || {};
  const score = pickNumeric(response.SuggestedScore, response.PronAccuracy, firstSentence.SuggestedScore, firstSentence.PronAccuracy, 0);
  const accuracy = pickNumeric(response.PronAccuracy, firstSentence.PronAccuracy, score);
  const fluency = normalizePercentMetric(pickNumeric(response.PronFluency, firstSentence.PronFluency, 0));
  const completion = normalizePercentMetric(pickNumeric(response.PronCompletion, firstSentence.PronCompletion, 0));
  const prosody = normalizePercentMetric(pickNumeric(response.PronProsody, firstSentence.PronProsody, 0));
  const problemWords = wordResults
    .map(item => ({
      word: item.Word || item.MemWord || item.ReferenceWord,
      score: pickNumeric(item.PronAccuracy, item.SuggestedScore, item.Score, 0),
      phoneme: item.PhoneInfo || item.Phoneme || null
    }))
    .filter(item => item.word && item.score > 0 && item.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  return {
    score: Math.round(score),
    transcript: response.Sentence || response.Text || refText,
    feedback: buildTencentFeedback(score, accuracy, fluency, completion, problemWords),
    errors: problemWords,
    metrics: {
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      completion: Math.round(completion),
      prosody: Math.round(prosody)
    },
    raw: {
      requestId: response.RequestId,
      status: response.Status,
      sessionId: response.SessionId
    },
    source: "tencent-soe"
  };
}

function pickNumeric(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizePercentMetric(value) {
  if (!Number.isFinite(Number(value))) return 0;
  const numeric = Number(value);
  if (numeric >= 0 && numeric <= 1) return numeric * 100;
  return numeric;
}

function buildTencentFeedback(score, accuracy, fluency, completion, problemWords) {
  const notes = [];
  if (score >= 85) notes.push("整体发音清晰自然");
  else if (score >= 70) notes.push("整体可理解，部分音素和节奏还可以更稳定");
  else notes.push("建议放慢语速，先把单词发完整再提高速度");

  if (accuracy && accuracy < 75) notes.push("准确度偏低，注意元音和词尾辅音");
  if (fluency && fluency < 75) notes.push("流利度可以提升，练习短语连读和自然停顿");
  if (completion && completion < 80) notes.push("完整度不足，尽量把句子读完");
  if (problemWords.length) notes.push("重点练习：" + problemWords.map(item => item.word).join(", "));
  return notes.join("；") + "。";
}

async function runPronunciationAnalysis(audioBase64, expectedText) {
  if (hasTencentSoeConfig()) {
    try {
      return await runTencentPronunciationEvaluation(audioBase64, expectedText);
    } catch (error) {
      console.warn("Tencent SOE pronunciation evaluation failed, falling back:", error.message);
    }
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "speaking-practice-"));
  const inputPath = path.join(tempDir, "recording.webm");
  const audioBuffer = decodeAudioBase64(audioBase64);
  await fs.writeFile(inputPath, audioBuffer);

  const pythonCode = `
import json
import os
import sys

sys.path.insert(0, os.getcwd())
import audio
import speech

audio_path = sys.argv[1]
expected_text = sys.argv[2]
wav_path = audio.webp2wav(audio_path)
sound = audio.load(wav_path)
result = speech.compare_audio_with_text(sound, expected_text)
print(json.dumps(result, ensure_ascii=False))
`;

  try {
    const raw = await runProcess("python3", ["-c", pythonCode, inputPath, expectedText || "Please speak naturally."], {
      cwd: OPEN_PRONOUNCE_DIR,
      timeout: 120000
    });
    const parsed = JSON.parse(raw.trim().split("\n").pop());
    return normalizePronunciationResult(parsed);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out`));
    }, options.timeout || 30000);

    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `${command} exited with code ${code}`));
      }
    });
  });
}

function normalizePronunciationResult(result) {
  const differences = result.differences || {};
  const errors = Array.isArray(differences.errors) ? differences.errors.slice(0, 6) : [];
  return {
    score: Math.round(Number(result.score || 0)),
    transcript: result.transcribe || differences.transcribe || "",
    feedback: result.feedback || differences.feedback || "",
    errors,
    prosody: result.prosody || null,
    raw: {
      distance: result.distance,
      phonemeDistance: differences.phoneme_distance,
      wordDistance: differences.word_distance
    }
  };
}

function buildFallbackPronunciation(text, reason = "") {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const longWords = words.filter(word => word.length >= 7).length;
  const score = Math.max(55, Math.min(88, 65 + Math.min(wordCount, 12) + longWords * 2));
  return {
    score,
    transcript: text || "",
    feedback: reason
      ? "音频级发音评分暂时不可用，当前分数基于表达长度和清晰度信号估算。"
      : "请尽量使用完整回答并保持清晰语速。音频级评分可用后会进一步校准该分数。",
    errors: [],
    prosody: null
  };
}

// Connection tracking
const connections = new Map();
let totalConnections = 0;
let activeConnections = 0;

// Socket.IO logic with enhanced features
io.on("connection", (socket) => {
  totalConnections++;
  activeConnections++;
  
  const clientInfo = {
    id: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date().toISOString(),
    messageCount: 0,
    lastActivity: new Date()
  };
  
  connections.set(socket.id, clientInfo);
  
  console.log(`✅ Client connected: ${socket.id} (${activeConnections} active, ${totalConnections} total)`);
  
  // Send connection confirmation
  socket.emit('connection-confirmed', {
    id: socket.id,
    serverTime: new Date().toISOString(),
    features: ['voice-chat', 'multiple-models', 'conversation-history', 'themes']
  });

  // Handle chat messages with enhanced processing
  socket.on("chat message", async (data) => {
    const startTime = Date.now();
    
    try {
      // Update client activity
      const client = connections.get(socket.id);
      if (client) {
        client.messageCount++;
        client.lastActivity = new Date();
      }

      // Handle both old string format and new object format
      let text, model, personality, learningMode, difficultyLevel, feedbackStyle, sessionContext;
      
      if (typeof data === 'string') {
        // Old format - just text
        text = data;
        model = 'openai/gpt-3.5-turbo';
        personality = 'conversation_partner';
        learningMode = 'conversation';
        difficultyLevel = 'intermediate';
        feedbackStyle = 'gentle';
        sessionContext = {};
      } else if (typeof data === 'object' && data !== null) {
        // New format - object with learning parameters
        text = data.text;
        model = data.model || 'openai/gpt-3.5-turbo';
        personality = data.personality || 'conversation_partner';
        learningMode = data.learningMode || 'conversation';
        difficultyLevel = data.difficultyLevel || 'intermediate';
        feedbackStyle = data.feedbackStyle || 'gentle';
        sessionContext = data.sessionContext || {};
      } else {
        throw new Error('Invalid message format');
      }

      if (!text || typeof text !== 'string') {
        throw new Error('Message text is required');
      }

      if (text.length > CONFIG.maxMessageLength) {
        throw new Error(`Message too long. Maximum ${CONFIG.maxMessageLength} characters allowed.`);
      }

      console.log(`🗣️ [${socket.id}] User said: "${text}" (Mode: ${learningMode}, Level: ${difficultyLevel})`);

      // Analyze speech for learning feedback
      const speechAnalysis = await analyzeSpeechForLearning(text, difficultyLevel, learningMode);

      // Get enhanced personality prompt with learning context
      const systemPrompt = getEnhancedTutorPrompt(personality, difficultyLevel, feedbackStyle, speechAnalysis, sessionContext);

      // Prepare API request with learning context
      const apiRequest = {
        model: model,
          messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Student said: "${text}"\n\nScenario Context: ${JSON.stringify(sessionContext)}\nSpeech Analysis: ${JSON.stringify(speechAnalysis)}\n\nReply as the live speaking partner. Keep the conversation moving, give only one timely correction if needed, then ask a natural follow-up question.` }
        ],
        max_tokens: 600,
        temperature: 0.7,
        stream: false
      };

      // Make API call with retry logic
      const response = await makeAPICallWithRetry(apiRequest, CONFIG.maxRetries);
      
      if (!response || !response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response format');
      }

      const reply = response.data.choices[0].message.content;
      const processingTime = Date.now() - startTime;

      console.log(`🤖 [${socket.id}] Tutor reply (${processingTime}ms): "${reply}"`);

      // Send response with learning analytics
      socket.emit("tutor response", {
        reply: reply,
        speechAnalysis: speechAnalysis,
        learningFeedback: extractLearningFeedback(reply),
        metadata: {
          processingTime,
          model: model,
          personality: personality,
          learningMode: learningMode,
          difficultyLevel: difficultyLevel,
          timestamp: new Date().toISOString()
        }
      });

      // Update user progress
      await updateUserProgress(socket.id, speechAnalysis, learningMode);

      // Log learning interaction
      logLearningInteraction(socket.id, text, reply, speechAnalysis, learningMode, difficultyLevel, processingTime, true);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [${socket.id}] Error processing learning session (${processingTime}ms):`, error.message);

      let errorMessage = "I apologize, but I encountered an error. Please try again.";
      
      // Provide specific error messages for common issues
      if (error.message.includes('rate limit')) {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('Invalid message format') || error.message.includes('Message text is required')) {
        errorMessage = "Please provide a valid message.";
      } else if (error.message.includes('Message too long')) {
        errorMessage = error.message;
      }

      socket.emit("tutor response", {
        reply: errorMessage,
        speechAnalysis: null,
        learningFeedback: null,
        error: true
      });

      // Log failed interaction
      const failedText = typeof data === 'string' ? data : (data?.text || '');
      const failedMode = typeof data === 'object' ? (data?.learningMode || '') : '';
      logLearningInteraction(socket.id, failedText, errorMessage, null, failedMode, '', processingTime, false, error.message);
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    activeConnections--;
    const client = connections.get(socket.id);
    
    if (client) {
      const sessionDuration = Date.now() - new Date(client.connectedAt).getTime();
      console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason}, Duration: ${Math.round(sessionDuration/1000)}s, Messages: ${client.messageCount})`);
      connections.delete(socket.id);
    }
    
    console.log(`📊 Active connections: ${activeConnections}`);
  });

  // Handle ping for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// API call with retry logic
async function makeAPICallWithRetry(requestData, maxRetries = 3) {
  let lastError;
  
  // Check if API key is available
  if (!CONFIG.apiKey) {
    console.warn('⚠️ No AI API key found, using fallback response');
    return createFallbackResponse(requestData);
  }

  const apiRequestData = {
    ...requestData,
    model: normalizeChatModel(requestData.model)
  };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API attempt ${attempt}/${maxRetries}`);
      
      const response = await axios.post(CONFIG.apiUrl, apiRequestData, {
        headers: {
          Authorization: `Bearer ${CONFIG.apiKey}`,
          "HTTP-Referer": `http://localhost:${CONFIG.port}`,
          "Content-Type": "application/json",
          "X-Title": "AI English Speaking Coach"
        },
        timeout: CONFIG.timeout,
        validateStatus: (status) => status < 500 // Retry on server errors only
      });

      if (response.status === 429) {
        // Rate limited - wait before retry
        const retryAfter = parseInt(response.headers['retry-after']) || Math.pow(2, attempt);
        console.log(`⏳ Rate limited, waiting ${retryAfter}s before retry...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.status >= 400) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      return response;

    } catch (error) {
      lastError = error;
      console.error(`❌ API attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // If all API attempts failed, use fallback
  console.warn('⚠️ All API attempts failed, using fallback response');
  return createFallbackResponse(requestData);
}

function normalizeChatModel(model) {
  const allowedModels = new Set(["deepseek-chat", "deepseek-reasoner"]);
  if (allowedModels.has(model)) return model;
  return CONFIG.defaultModel;
}

// Create fallback response when API is not available
function createFallbackResponse(requestData) {
  const userPayload = requestData.messages?.[1]?.content || '';
  const studentText = extractStudentText(userPayload);
  const scenarioContext = extractJsonAfterLabel(userPayload, "Scenario Context") || {};
  const speechAnalysis = extractJsonAfterLabel(userPayload, "Speech Analysis") || {};
  const scenarioId = scenarioContext.scenario || "";
  const learningMode = scenarioContext.learningMode || "";
  const scenario = SCENARIOS[scenarioId] || null;
  const lower = studentText.toLowerCase();
  const wordCount = studentText.split(/\s+/).filter(Boolean).length;

  const correction = buildLightCorrection(studentText, speechAnalysis);
  if (learningMode === "grammar") {
    const corrected = correction || "你的句子语法基本正确。";
    const practice = correction
      ? "Practice: please repeat the corrected sentence once."
      : "Practice: please make one more sentence using the same structure.";
    const fallbackReply = [
      `Correction: ${corrected}`,
      "Why: 这是语法专项模式，我会优先检查句子结构、动词形式和表达是否自然。",
      practice
    ].join(" ");
    return {
      data: {
        choices: [{
          message: {
            content: fallbackReply
          }
        }]
      }
    };
  }

  const nextQuestion = buildScenarioFollowUp(scenarioId, lower, wordCount);
  const praise = wordCount >= 8
    ? "Good, that is a complete answer."
    : "Good start. Try to answer in a full sentence.";
  const scenarioLead = scenario ? `In this ${scenario.name} practice, ` : "";
  const fallbackReply = [
    `${praise}`,
    correction,
    `${scenarioLead}${nextQuestion}`
  ].filter(Boolean).join(" ");
  
  return {
    data: {
      choices: [{
        message: {
          content: fallbackReply
        }
      }]
    }
  };
}

function extractStudentText(payload) {
  const match = String(payload).match(/Student said:\s*"([\s\S]*?)"\s*\n/);
  return match ? match[1].trim() : String(payload).slice(0, 300).trim();
}

function extractJsonAfterLabel(payload, label) {
  const source = String(payload);
  const pattern = new RegExp(`${label}:\\s*(\\{[\\s\\S]*?\\})\\s*(?:\\n[A-Z][A-Za-z ]+:|\\n\\n|$)`);
  const match = source.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function buildLightCorrection(text, analysis = {}) {
  const lower = text.toLowerCase();
  if (/\bi am agree\b/.test(lower)) {
    return "Small correction: say \"I agree\" instead of \"I am agree\".";
  }
  if (/\bhe are\b|\bshe are\b|\bi are\b/.test(lower)) {
    return "Small grammar note: use \"he is\", \"she is\", or \"I am\".";
  }
  if (/\bcan you do for me\b/.test(lower)) {
    return "A more natural sentence is: \"What can you help me with?\"";
  }
  if (analysis.grammarIssues && analysis.grammarIssues.length > 0) {
    return `One thing to improve: ${analysis.grammarIssues[0].suggestion || analysis.grammarIssues[0].issue}`;
  }
  return "";
}

function buildScenarioFollowUp(scenarioId, lower, wordCount) {
  const genericShort = "Please add one reason and one detail.";
  const scenarioQuestions = {
    "job-interview": [
      "Can you describe one project you are proud of?",
      "What is one strength that makes you a good fit for this role?",
      "Can you give a specific example from your past experience?"
    ],
    restaurant: [
      "Would you like anything to drink with your meal?",
      "Do you have any allergies or food preferences?",
      "Would you like to ask about today's special?"
    ],
    meeting: [
      "What is the main blocker you want the team to discuss?",
      "What action item should we confirm before the meeting ends?",
      "Can you explain the impact on the schedule?"
    ],
    travel: [
      "Could you tell me your destination and travel date?",
      "Do you need help with a hotel, directions, or transportation?",
      "What problem would you like to solve first?"
    ],
    shopping: [
      "What size, color, or price range are you looking for?",
      "Would you like to compare two options?",
      "Do you want to ask about the return policy?"
    ],
    medical: [
      "How long have you had this symptom?",
      "Can you describe the pain or discomfort more clearly?",
      "Do you have any allergies or current medicine?"
    ],
    social: [
      "What do you usually like to do in your free time?",
      "Can you tell me more about that?",
      "What was the best part of your day?"
    ]
  };

  if (wordCount < 5) return genericShort;
  if (lower.includes("help") || lower.includes("can you")) {
    return "I can help you practice speaking. Please choose a role and answer as if this is a real conversation.";
  }

  const list = scenarioQuestions[scenarioId] || [
    "Can you say that again with one more detail?",
    "What is your reason for that answer?",
    "Can you give me an example?"
  ];
  const index = Math.abs(hashText(lower)) % list.length;
  return list[index];
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// Utility function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Speech Analysis for Learning
async function analyzeSpeechForLearning(text, difficultyLevel, learningMode) {
  const analysis = {
    originalText: text,
    wordCount: text.split(/\s+/).length,
    sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    grammarIssues: [],
    vocabularyLevel: '',
    pronunciationConcerns: [],
    fluencyScore: 0,
    suggestions: []
  };

  try {
    // Basic grammar analysis
    analysis.grammarIssues = analyzeGrammar(text);
    
    // Vocabulary assessment
    analysis.vocabularyLevel = assessVocabularyLevel(text, difficultyLevel);
    
    // Pronunciation concerns (based on common patterns)
    analysis.pronunciationConcerns = identifyPronunciationConcerns(text);
    
    // Fluency scoring
    analysis.fluencyScore = calculateFluencyScore(text, analysis.wordCount);
    
    // Generate suggestions based on learning mode
    analysis.suggestions = generateLearningSuggestions(analysis, learningMode, difficultyLevel);
    analysis.grammarScore = Math.max(45, 100 - analysis.grammarIssues.length * 18);
    analysis.pronunciationScore = Math.max(55, 88 - analysis.pronunciationConcerns.length * 6);
    analysis.vocabularyScore = scoreVocabularyLevel(analysis.vocabularyLevel, difficultyLevel);
    analysis.overallScore = Math.round(
      (analysis.grammarScore + analysis.pronunciationScore + analysis.vocabularyScore + analysis.fluencyScore) / 4
    );

  } catch (error) {
    console.error('Error in speech analysis:', error);
    analysis.error = 'Analysis temporarily unavailable';
  }

  return analysis;
}

function scoreVocabularyLevel(actualLevel, targetLevel) {
  const levels = { beginner: 1, intermediate: 2, advanced: 3, native: 4 };
  const actual = levels[actualLevel] || 1;
  const target = levels[targetLevel] || 2;
  const gap = Math.max(0, target - actual);
  return Math.max(55, Math.min(96, 82 + (actual - 2) * 7 - gap * 10));
}

// Basic Grammar Analysis
function analyzeGrammar(text) {
  const issues = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim().toLowerCase();
    
    // Check for common grammar issues
    if (trimmed.includes(' i ') && !trimmed.startsWith('i ')) {
      // Check if 'i' should be capitalized
      const iPositions = [];
      let pos = trimmed.indexOf(' i ');
      while (pos !== -1) {
        iPositions.push(pos + 1);
        pos = trimmed.indexOf(' i ', pos + 1);
      }
      if (iPositions.length > 0) {
        issues.push({
          type: 'capitalization',
          issue: 'The pronoun "I" should always be capitalized',
          suggestion: 'Remember to capitalize "I" when referring to yourself',
          severity: 'minor'
        });
      }
    }
    
    // Check for subject-verb agreement (basic)
    if (trimmed.includes(' are ') && (trimmed.includes(' i are ') || trimmed.includes(' he are ') || trimmed.includes(' she are '))) {
      issues.push({
        type: 'subject_verb_agreement',
        issue: 'Subject-verb disagreement detected',
        suggestion: 'Use "am" with "I", "is" with "he/she/it", "are" with "you/we/they"',
        severity: 'major'
      });
    }
    
    // Check for double negatives
    const negatives = ['not', 'no', 'never', 'nothing', 'nobody', 'nowhere'];
    const negativeCount = negatives.reduce((count, neg) => count + (trimmed.split(neg).length - 1), 0);
    if (negativeCount > 1) {
      issues.push({
        type: 'double_negative',
        issue: 'Avoid using double negatives in English',
        suggestion: 'Use only one negative word per clause',
        severity: 'major'
      });
    }
  });
  
  return issues;
}

// Vocabulary Level Assessment
function assessVocabularyLevel(text, targetLevel) {
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(words)];
  
  // Basic vocabulary lists (simplified)
  const basicWords = ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must'];
  const intermediateWords = ['although', 'however', 'therefore', 'furthermore', 'nevertheless', 'consequently', 'specifically', 'particularly', 'especially'];
  const advancedWords = ['notwithstanding', 'subsequently', 'predominantly', 'substantially', 'comprehensively', 'systematically'];
  
  const basicCount = words.filter(word => basicWords.includes(word)).length;
  const intermediateCount = words.filter(word => intermediateWords.includes(word)).length;
  const advancedCount = words.filter(word => advancedWords.includes(word)).length;
  
  const totalWords = words.length;
  const basicRatio = basicCount / totalWords;
  const intermediateRatio = intermediateCount / totalWords;
  const advancedRatio = advancedCount / totalWords;
  
  if (advancedRatio > 0.1) return 'advanced';
  if (intermediateRatio > 0.05) return 'intermediate';
  return 'beginner';
}

// Pronunciation Concerns Identification
function identifyPronunciationConcerns(text) {
  const concerns = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Common pronunciation challenges
  const difficultWords = {
    'through': 'pronounced as "throo", not "throw"',
    'thought': 'pronounced as "thawt", with the "th" sound',
    'three': 'practice the "th" sound at the beginning',
    'world': 'pronounced as "wurld", not "word"',
    'work': 'pronounced as "wurk", with a clear "r" sound',
    'comfortable': 'pronounced as "KUHM-fər-tə-bəl", four syllables'
  };
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (difficultWords[cleanWord]) {
      concerns.push({
        word: cleanWord,
        tip: difficultWords[cleanWord],
        type: 'pronunciation'
      });
    }
  });
  
  return concerns;
}

// Fluency Score Calculation
function calculateFluencyScore(text, wordCount) {
  let score = 50; // Base score
  
  // Longer responses generally indicate better fluency
  if (wordCount > 20) score += 20;
  else if (wordCount > 10) score += 10;
  else if (wordCount < 5) score -= 20;
  
  // Check for complex sentence structures
  const complexMarkers = ['although', 'because', 'since', 'while', 'whereas', 'however', 'therefore'];
  const hasComplexStructure = complexMarkers.some(marker => text.toLowerCase().includes(marker));
  if (hasComplexStructure) score += 15;
  
  // Check for varied vocabulary (no repeated words)
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(words)];
  const varietyRatio = uniqueWords.length / words.length;
  if (varietyRatio > 0.8) score += 10;
  else if (varietyRatio < 0.6) score -= 10;
  
  return Math.min(100, Math.max(0, score));
}

// Generate Learning Suggestions
function generateLearningSuggestions(analysis, learningMode, difficultyLevel) {
  const suggestions = [];
  
  if (learningMode === 'grammar' && analysis.grammarIssues.length > 0) {
    suggestions.push('Focus on the grammar corrections provided above');
  }
  
  if (learningMode === 'vocabulary' && analysis.vocabularyLevel !== difficultyLevel) {
    if (analysis.vocabularyLevel === 'beginner' && difficultyLevel === 'intermediate') {
      suggestions.push('Try using more complex vocabulary and linking words');
    }
  }
  
  if (learningMode === 'fluency' && analysis.fluencyScore < 70) {
    suggestions.push('Try speaking in longer sentences and using connecting words');
  }
  
  if (analysis.wordCount < 10) {
    suggestions.push('Try to elaborate more on your thoughts - give examples or details');
  }
  
  return suggestions;
}

// Enhanced Tutor Prompt Generation
function getEnhancedTutorPrompt(personality, difficultyLevel, feedbackStyle, speechAnalysis, sessionContext = {}) {
  let basePrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.conversation_partner;
  
  const difficultyContext = {
    beginner: "The student is a beginner. Use simple vocabulary and basic grammar. Be very encouraging and patient.",
    intermediate: "The student has intermediate skills. You can use more complex vocabulary and grammar structures.",
    advanced: "The student is advanced. Feel free to use sophisticated vocabulary and complex grammar.",
    native: "The student aims for native-level proficiency. Use natural, idiomatic expressions and advanced structures."
  };
  
  const feedbackContext = {
    gentle: "Provide feedback in a very encouraging and supportive way. Focus on positive reinforcement.",
    detailed: "Give comprehensive analysis with specific examples and explanations.",
    immediate: "Correct errors right away but keep the conversation flowing.",
    summary: "Focus on conversation flow now, save detailed feedback for the end."
  };
  
  const scenarioId = sessionContext.scenario || "";
  const scenario = SCENARIOS[scenarioId];
  const scenarioContext = scenario
    ? `Scenario: ${scenario.name}. Role-play instruction: ${scenario.role}`
    : "Scenario: general English speaking practice.";
  const learningMode = sessionContext.learningMode || "";
  const modeInstruction = getModeInstruction(learningMode, personality);

  return `${basePrompt}

Student Level: ${difficultyContext[difficultyLevel]}
Feedback Style: ${feedbackContext[feedbackStyle]}
${scenarioContext}
${modeInstruction}

Based on the speech analysis provided, adapt your response to help the student improve while maintaining an engaging conversation.`;
}

function getModeInstruction(learningMode, personality) {
  if (learningMode === "grammar" || personality === "grammar_tutor") {
    return `
You are now in Grammar Focus Mode.

Important rules:
- Do NOT reply like a normal chatbot.
- Your main task is to check the student's grammar.
- Keep the feedback short and useful.
- Chinese explanations are allowed, but the corrected sentence must be English.

Reply format must be:

【语法专项反馈】

1. 错误定位：
Explain the main grammar problem in Chinese. If there is no clear grammar error, say it is basically correct.

2. 正确表达：
Give one corrected or more natural English sentence.

3. 简短解释：
Explain the grammar point briefly in Chinese.

4. 跟读练习：
Ask the student to repeat the corrected English sentence.

Style:
- Chinese explanations.
- English examples.
- Focus on one main grammar issue at a time.`;
  }

  if (learningMode === "pronunciation" || personality === "pronunciation_coach") {
    return `
You are now in Pronunciation Training Mode.

Important rules:
- Do NOT reply like a normal chatbot.
- Do NOT continue interview conversation in this mode.
- This mode is repeat-after-me pronunciation practice.
- Use clear section tags exactly like [PRONUNCIATION], [TIP], and [PRACTICE].
- Each tag must start on its own section.
- Keep the response short.
- The [PRACTICE] section must include one short English phrase or sentence in quotation marks.
- The assistant will read the [PRACTICE] sentence aloud, so make it suitable for follow-along practice.

Reply format must be exactly:

[PRONUNCIATION]
Comment briefly on the student's pronunciation or recognized text.

[TIP]
Give one practical pronunciation tip.

[PRACTICE]
Please repeat after me: "one short English practice sentence"

Examples:
[PRACTICE]
Please repeat after me: "I would like to improve my pronunciation."

Style:
- Use simple English.
- You may include very short Chinese only if necessary.
- Do not ask unrelated interview questions.
- Do not add extra conversation after [PRACTICE].`;
  }


  if (learningMode === "vocabulary" || personality === "vocabulary_builder") {
    return `
  You are now in Vocabulary Expression Upgrade Mode.

  Important rules:
  - Do NOT act as an interviewer.
  - Do NOT continue the conversation.
  - Do NOT ask follow-up interview questions.
  - Do NOT mainly correct grammar.
  - Your job is to help the student express the same meaning in better, more natural English.
  - Give several alternative ways to say the student's sentence.
  - Explain useful words or phrases briefly.
  - Keep the response short and structured.
  - Use section tags exactly like [VOCABULARY], [BETTER], [MORE NATURAL], [PHRASES], and [PRACTICE].
  - The [PRACTICE] section must include one complete English sentence in quotation marks.
  - Do not add anything after [PRACTICE].

  Reply format must be exactly:

  [VOCABULARY]
  Briefly explain in Chinese what the student wants to express.

  [BETTER]
  Give one simple improved English version.

  [MORE NATURAL]
  Give one or two more natural English alternatives.

  [PHRASES]
  - phrase 1: short Chinese meaning
  - phrase 2: short Chinese meaning
  - phrase 3: short Chinese meaning

  [PRACTICE]
  Please repeat after me: "one natural English sentence"

  Example:
  Student says: hello good morning

  [VOCABULARY]
  你想表达的是早上见面时的礼貌问候。

  [BETTER]
  Good morning. Nice to meet you.

  [MORE NATURAL]
  Good morning. It's great to meet you today.
  Good morning. I'm happy to meet you.

  [PHRASES]
  - Nice to meet you: 很高兴见到你
  - Great to meet you: 更自然、更热情的表达
  - Good morning: 正式且礼貌的早上问候

  [PRACTICE]
  Please repeat after me: "Good morning. It's great to meet you today."`;
  }


  if (learningMode === "fluency" || personality === "fluency_coach") {
    return `
  You are now in Fluency Expansion Mode.

  Important rules:
  - Do NOT act as a normal chatbot.
  - Do NOT mainly correct grammar.
  - Do NOT mainly upgrade vocabulary.
  - Your job is to help the student speak longer and more smoothly.
  - Encourage the student to expand a short answer into 2-3 natural sentences.
  - Focus on connectors, sentence flow, and complete answers.
  - Use section tags exactly like [FLUENCY], [EXPAND], [CONNECTORS], and [PRACTICE].
  - The [PRACTICE] section must include one complete English sentence in quotation marks.
  - Do not add anything after [PRACTICE].

  Reply format must be exactly:

  [FLUENCY]
  Briefly explain in Chinese whether the student's answer is too short or needs more connection.

  [EXPAND]
  Give a more fluent 2-3 sentence version of the student's answer.

  [CONNECTORS]
  - connector 1: short Chinese meaning
  - connector 2: short Chinese meaning
  - connector 3: short Chinese meaning

  [PRACTICE]
  Please repeat after me: "one useful sentence from the expanded answer"

  Example:
  Student says: I like English.

  [FLUENCY]
  你的回答可以更完整一些。可以加入原因或例子，让表达更自然。

  [EXPAND]
  I like English because it helps me communicate with more people. I also enjoy learning new words and using them in real conversations.

  [CONNECTORS]
  - because: 用来说明原因
  - also: 用来补充信息
  - for example: 用来举例

  [PRACTICE]
  Please repeat after me: "I like English because it helps me communicate with more people."`;
  }

  return `
Conversation Mode:
- Respond naturally as an English speaking partner.
- Give light feedback only when helpful.
- Keep the conversation moving.`;
}

function generateSessionSummary(payload) {
  const interactions = Array.isArray(payload.interactions) ? payload.interactions : [];
  const pronunciationResults = Array.isArray(payload.pronunciationResults) ? payload.pronunciationResults : [];
  const scores = payload.scores || {};
  const scenario = SCENARIOS[payload.scenario] || null;
  const wordsSpoken = Number(payload.wordsSpoken || 0);
  const messagesCount = Number(payload.messagesCount || interactions.length || 0);
  const durationMs = Number(payload.durationMs || 0);
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  const scoreEntries = {
    grammar: normalizeScore(scores.grammar),
    pronunciation: normalizeScore(scores.pronunciation),
    vocabulary: normalizeScore(scores.vocabulary),
    fluency: normalizeScore(scores.fluency)
  };
  const validScoreValues = Object.values(scoreEntries).filter(value => Number.isFinite(value));
  const overallScore = validScoreValues.length
    ? Math.round(validScoreValues.reduce((sum, value) => sum + value, 0) / validScoreValues.length)
    : null;
  const weakAreas = Object.entries({
    grammar: scoreEntries.grammar,
    pronunciation: scoreEntries.pronunciation,
    vocabulary: scoreEntries.vocabulary,
    fluency: scoreEntries.fluency
  })
    .filter(([, value]) => Number.isFinite(value) && value < 75)
    .map(([key]) => key);

  const areaLabels = {
    grammar: "语法",
    pronunciation: "发音",
    vocabulary: "词汇表达",
    fluency: "流利度"
  };

  const scoreCards = [
    {
      label: "语法",
      value: formatScore(scoreEntries.grammar),
      percent: scoreEntries.grammar || 0,
      note: getScoreNote(scoreEntries.grammar, "句子结构与时态控制")
    },
    {
      label: "发音",
      value: formatScore(scoreEntries.pronunciation),
      percent: scoreEntries.pronunciation || 0,
      note: getScoreNote(scoreEntries.pronunciation, "准确度、完整度和清晰度")
    },
    {
      label: "词汇",
      value: formatScore(scoreEntries.vocabulary),
      percent: scoreEntries.vocabulary || 0,
      note: getScoreNote(scoreEntries.vocabulary, "表达丰富度和场景贴合度")
    },
    {
      label: "流利度",
      value: formatScore(scoreEntries.fluency),
      percent: scoreEntries.fluency || 0,
      note: getScoreNote(scoreEntries.fluency, "连续表达和停顿控制")
    }
  ];

  const highlights = [];
  if (messagesCount >= 3) highlights.push("你完成了多轮连续对话，能保持交流推进。");
  if (wordsSpoken >= 60) highlights.push("你的输出量足够用于流利度分析。");
  if (Number(scoreEntries.fluency) >= 80) highlights.push("你的回答整体比较流畅。");
  if (Number(scoreEntries.grammar) >= 80) highlights.push("本次练习中语法控制较稳定。");
  if (Number(scoreEntries.pronunciation) >= 75) highlights.push("本次发音整体可理解，具备继续进行真实对话的基础。");
  if (scenario) highlights.push(`你围绕「${scenario.name}」完成了场景化练习，方向比较明确。`);
  if (highlights.length === 0) highlights.push("你完成了一次有明确目标的口语练习。");

  const diagnosis = [];
  if (messagesCount < 3) diagnosis.push("本次对话轮次偏少，报告判断会更依赖单句表现，建议至少完成 3 轮再总结。");
  if (wordsSpoken < 40) diagnosis.push("本次英文输出量偏少，可以尝试把每个回答扩展到 2 句以上。");
  if (weakAreas.length > 0) {
    diagnosis.push(`需要优先关注：${weakAreas.map(key => areaLabels[key]).join("、")}。`);
  }
  const latestPronunciation = pronunciationResults[pronunciationResults.length - 1] || null;
  if (latestPronunciation?.problemWords?.length) {
    diagnosis.push(`发音中建议重点复练：${latestPronunciation.problemWords.slice(0, 5).join("、")}。`);
  }
  if (diagnosis.length === 0) {
    diagnosis.push("整体表现稳定，可以在下一轮中提高回答长度和场景细节。");
  }

  const nextSteps = [];
  if (weakAreas.includes("pronunciation")) nextSteps.push("重复两段短回答，重点放慢语速并说清词尾。");
  if (weakAreas.includes("grammar")) nextSteps.push("每次回答后，把一句修改后的句子再大声复述一遍。");
  if (weakAreas.includes("vocabulary")) nextSteps.push("下次练习前准备 5 个该场景常用表达。");
  if (weakAreas.includes("fluency")) nextSteps.push("回答时加入一个原因和一个例子，训练更长的表达。");
  if (nextSteps.length === 0) nextSteps.push("下次可以提高难度，或切换为即时纠错模式。");

  const practicePlan = buildPracticePlan(weakAreas, scenario);

  return {
    title: scenario ? `${scenario.name} 练习总结` : "口语练习总结",
    scenario: scenario ? scenario.name : "通用练习",
    overview: buildSummaryOverview({ scenario, messagesCount, wordsSpoken, overallScore }),
    metrics: {
      messagesCount,
      wordsSpoken,
      minutes,
      wordsPerMinute: Math.round(wordsSpoken / minutes),
      overallScore: overallScore || "--",
      scores: scoreEntries
    },
    scoreCards,
    highlights,
    diagnosis,
    weakAreas,
    practicePlan,
    nextSteps,
    closing: "本次练习完成得不错。下一步最有效的提升方式，是把修改后的回答大声复述出来，而不只是阅读反馈。"
  };
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatScore(value) {
  return Number.isFinite(value) ? `${value}分` : "--";
}

function getScoreNote(score, fallback) {
  if (!Number.isFinite(score)) return "本次数据不足，继续练习后会更新";
  if (score >= 85) return "表现稳定，可以提高任务难度";
  if (score >= 70) return fallback;
  return "建议作为下轮练习重点";
}

function buildSummaryOverview({ scenario, messagesCount, wordsSpoken, overallScore }) {
  const scenarioText = scenario ? `在「${scenario.name}」场景中` : "在本次练习中";
  const scoreText = Number.isFinite(overallScore) ? `综合表现约 ${overallScore} 分` : "已完成基础练习记录";
  return `${scenarioText}，你完成了 ${messagesCount} 轮对话，累计说出 ${wordsSpoken} 个词，${scoreText}。`;
}

function buildPracticePlan(weakAreas, scenario) {
  const plan = [];
  if (scenario) {
    plan.push(`复盘 1 个「${scenario.name}」高频问题`);
  } else {
    plan.push("选择 1 个真实场景继续练习");
  }
  if (weakAreas.includes("pronunciation")) plan.push("跟读同一句 3 遍");
  if (weakAreas.includes("grammar")) plan.push("重说 1 个纠正后的句子");
  if (weakAreas.includes("vocabulary")) plan.push("替换 2 个更自然表达");
  if (weakAreas.includes("fluency")) plan.push("用 because / for example 扩展回答");
  if (plan.length < 3) plan.push("把回答扩展到 2-3 句", "录音后立刻复听一次");
  return plan.slice(0, 5);
}

// Extract Learning Feedback from AI Response
function extractLearningFeedback(aiResponse) {
  const feedback = {
    grammar: [],
    pronunciation: [],
    vocabulary: [],
    general: []
  };
  
  // Parse structured feedback from AI response
  const feedbackRegex = /\[FEEDBACK\](.*?)(?=\[|$)/gs;
  const explanationRegex = /\[EXPLANATION\](.*?)(?=\[|$)/gs;
  const exampleRegex = /\[EXAMPLE\](.*?)(?=\[|$)/gs;
  const pronunciationRegex = /\[PRONUNCIATION\](.*?)(?=\[|$)/gs;
  const vocabularyRegex = /\[VOCABULARY\](.*?)(?=\[|$)/gs;
  
  let match;
  
  while ((match = feedbackRegex.exec(aiResponse)) !== null) {
    feedback.grammar.push(match[1].trim());
  }
  
  while ((match = pronunciationRegex.exec(aiResponse)) !== null) {
    feedback.pronunciation.push(match[1].trim());
  }
  
  while ((match = vocabularyRegex.exec(aiResponse)) !== null) {
    feedback.vocabulary.push(match[1].trim());
  }
  
  return feedback;
}

// Update User Progress
async function updateUserProgress(socketId, speechAnalysis, learningMode) {
  // In a real application, this would update a database
  // For now, we'll just log the progress
  const progressUpdate = {
    socketId,
    timestamp: new Date().toISOString(),
    learningMode,
    grammarScore: speechAnalysis.grammarIssues.length === 0 ? 100 : Math.max(0, 100 - (speechAnalysis.grammarIssues.length * 20)),
    fluencyScore: speechAnalysis.fluencyScore,
    vocabularyLevel: speechAnalysis.vocabularyLevel,
    wordCount: speechAnalysis.wordCount
  };
  
  console.log('📊 Progress Update:', JSON.stringify(progressUpdate, null, 2));
}

// Enhanced Logging for Learning Interactions
function logLearningInteraction(socketId, userMessage, tutorReply, speechAnalysis, learningMode, difficultyLevel, processingTime, success, errorDetails = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    socketId,
    userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    tutorReply: tutorReply.substring(0, 100) + (tutorReply.length > 100 ? '...' : ''),
    learningMode,
    difficultyLevel,
    speechAnalysis: speechAnalysis ? {
      wordCount: speechAnalysis.wordCount,
      grammarIssuesCount: speechAnalysis.grammarIssues.length,
      fluencyScore: speechAnalysis.fluencyScore,
      vocabularyLevel: speechAnalysis.vocabularyLevel
    } : null,
    processingTime,
    success,
    errorDetails
  };
  
  // In production, you might want to log to a file or database
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Learning Interaction:', JSON.stringify(logEntry, null, 2));
  }
}

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  http.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close all socket connections
    io.close(() => {
      console.log('✅ Socket.IO server closed');
      
      // Exit the process
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
http.listen(CONFIG.port, () => {
  console.log('🎓 English Tutor AI Server Started');
  console.log(`📍 Server running at http://localhost:${CONFIG.port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 AI API configured: ${CONFIG.apiKey ? '✅' : '❌'}`);
  console.log(`🧠 Chat model: ${CONFIG.defaultModel}`);
  console.log(`⚡ Features: Speech Analysis, Grammar Checking, Progress Tracking`);
  console.log(`📊 Rate Limit: ${CONFIG.rateLimitMax} requests per ${CONFIG.rateLimitWindow/1000/60} minutes`);
  console.log('🎯 Ready for English learning sessions!');
});
