# API 通信契约

> AI English Speaking Coach — 前后端 REST & WebSocket 接口规范  
> 数据模型定义见 `backend/app/schemas/`

---

## 1. 核心数据模型

### Scene — 练习场景

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `SceneId` | `interview` / `ordering` / `meeting` |
| `name` | `string` | 英文名称 |
| `name_zh` | `string` | 中文名称 |
| `description` | `string` | 场景简介 |
| `system_prompt` | `string` | LLM 系统提示词（角色背景） |
| `icon` | `string?` | 前端图标 |

### Message — 单条对话

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 消息 UUID |
| `session_id` | `string` | 会话 ID |
| `role` | `user \| assistant \| system` | 发言角色 |
| `content` | `string` | 文本内容 |
| `audio_url` | `string?` | 音频链接 |
| `correction` | `Correction?` | 纠错提示（user 消息） |
| `pronunciation_score` | `float?` | 该句发音分 0-100 |
| `created_at` | `datetime` | 创建时间 |

### Correction — 纠错详情

| 字段 | 类型 | 说明 |
|------|------|------|
| `original` | `string` | 原始表达 |
| `corrected` | `string` | 推荐表达 |
| `explanation` | `string` | 说明 |
| `correction_type` | `grammar \| expression \| pronunciation \| vocabulary` | 类型 |
| `severity` | `minor \| moderate \| major` | 严重程度 |

### SessionReport — 课后总结

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | `string` | 会话 ID |
| `scene_id` | `SceneId` | 场景 |
| `scores` | `ScoreBreakdown` | 多维度评分 |
| `corrections` | `CorrectionRecord[]` | 全部纠错列表 |
| `suggestions` | `ImprovementSuggestion[]` | 量化提升建议 |
| `summary` | `string` | 综合反馈 |
| `highlights` | `string[]` | 表现亮点 |
| `total_turns` | `int` | 对话轮数 |
| `duration_seconds` | `int` | 练习时长（秒） |

### ScoreBreakdown — 评分维度

| 字段 | 范围 | 说明 |
|------|------|------|
| `pronunciation` | 0-100 | 发音 |
| `grammar` | 0-100 | 语法 |
| `fluency` | 0-100 | 流利度 |
| `vocabulary` | 0-100 | 词汇 |
| `overall` | 0-100 | 综合 |

---

## 2. REST API 路由清单

### 健康检查

| 方法 | 路径 | 说明 | 响应 |
|------|------|------|------|
| `GET` | `/health` | 服务存活探测 | `{ "status": "ok" }` |

### 场景

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| `GET` | `/api/scenes` | 获取全部预设场景 | — | `SceneListResponse` |
| `GET` | `/api/scenes/{scene_id}` | 获取单个场景详情 | — | `Scene` |

### 会话

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| `POST` | `/api/session/start` | 创建练习会话 | `SessionStartRequest` | `SessionStartResponse` |
| `GET` | `/api/session/{session_id}` | 查询会话状态 | — | `SessionInfo` |
| `POST` | `/api/session/{session_id}/end` | 结束会话并生成报告 | `SessionEndRequest` | `SessionEndResponse` |
| `GET` | `/api/session/{session_id}/messages` | 获取对话历史 | — | `MessageListResponse` |
| `GET` | `/api/session/{session_id}/report` | 获取课后总结报告 | — | `SessionReport` |

#### POST `/api/session/start` 示例

**Request**
```json
{
  "scene_id": "interview"
}
```

**Response**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "scene": {
    "id": "interview",
    "name": "Job Interview",
    "name_zh": "面试",
    "description": "Practice answering common interview questions...",
    "system_prompt": "You are a friendly but professional HR interviewer...",
    "icon": "💼"
  },
  "status": "active",
  "started_at": "2026-06-05T10:00:00Z",
  "websocket_url": "ws://localhost:8000/api/chat/ws?session_id=550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 3. WebSocket 实时对话

| 协议 | 路径 | 说明 |
|------|------|------|
| `WS` | `/api/chat/ws?session_id={session_id}` | 实时语音/文本对话通道 |

连接前须先调用 `POST /api/session/start` 获取 `session_id`。

### 3.1 单轮对话时序

```
Client                          Server
  │                               │
  │── audio_chunk (×N) ──────────►│  流式上传录音
  │── audio_end ─────────────────►│  触发 STT
  │◄── transcript (is_final) ────│  返回最终转写
  │◄── correction ───────────────│  语法/表达纠错（可与下步并行）
  │◄── assistant_message ────────│  LLM 文本回复
  │◄── assistant_audio ──────────│  TTS 音频
  │                               │
```

### 3.2 Client → Server 事件

| `type` | 模型 | 说明 |
|--------|------|------|
| `audio_chunk` | `WSClientAudioChunk` | 音频片段（base64） |
| `audio_end` | `WSClientAudioEnd` | 一句话录音结束 |
| `text_input` | `WSClientTextInput` | 文字输入（跳过 STT） |
| `ping` | `WSClientPing` | 心跳 |

### 3.3 Server → Client 事件

| `type` | 模型 | 说明 |
|--------|------|------|
| `transcript` | `WSServerTranscript` | STT 转写（含 `is_final`） |
| `correction` | `WSServerCorrection` | 纠错 + 可选发音分 |
| `assistant_message` | `WSServerAssistantMessage` | AI 回复（含完整 `Message`） |
| `assistant_audio` | `WSServerAssistantAudio` | TTS 音频 URL 或 base64 |
| `session_ended` | `WSServerSessionEnded` | 会话结束通知 |
| `error` | `WSServerError` | 错误 |
| `pong` | `WSServerPong` | 心跳响应 |

### 3.4 纠错时机策略

| 模式 | 行为 | 适用场景 |
|------|------|----------|
| **异步（推荐）** | `correction` 与 `assistant_message` 并行推送，不阻塞 AI 回复 | 低延迟对话体验 |
| **同步** | 先推送 `correction`，再推送 `assistant_message` | 纠错优先展示 |

前端通过 `message_id` 将 `correction` 绑定到对应对话气泡。

---

## 4. 错误码约定

| HTTP / WS `code` | 说明 |
|------------------|------|
| `SESSION_NOT_FOUND` | 会话不存在 |
| `SESSION_ENDED` | 会话已结束 |
| `INVALID_SCENE` | 无效场景 ID |
| `STT_FAILED` | 语音转写失败 |
| `LLM_FAILED` | 大模型调用失败 |
| `TTS_FAILED` | 语音合成失败 |
| `AUDIO_INVALID` | 音频格式/数据无效 |

---

## 5. 前端 TypeScript 类型

镜像定义位于 `frontend/src/types/api.ts`，与后端 Pydantic 模型字段一一对应。
