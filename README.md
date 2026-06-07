# SceneSpeak AI — AI 英语口语陪练

> 面向真实场景的 AI 英语口语练习工具：场景化对话 · 实时语音 · 发音评测 · 语法纠错 · 课后总结 · 时光回溯

<p align="center">
  <img src="docs/screenshots/01-dashboard-scenarios.png" alt="场景探索矩阵 — 主页" width="100%" />
</p>

<p align="center">
  <img src="docs/screenshots/02-dashboard-history.png" alt="时光回溯与进化追踪" width="49%" />
  &nbsp;
  <img src="docs/screenshots/03-conversation.png" alt="沉浸式对话舱" width="49%" />
</p>

<p align="center">
  <img src="docs/screenshots/04-session-report.png" alt="课后总结报告" width="100%" />
</p>

## 功能亮点

- **场景探索矩阵** — 自由闲聊、职场面试、餐厅点餐、环球旅行、雅思口语、跨国会议等 6 大场景
- **沉浸式对话舱** — 深色赛博 UI、AI 虚拟教练、实时纠错与发音评测
- **课后 LLM 报告** — 五维雷达评分（发音 / 语法 / 词汇 / 流畅度 / 连贯性）+ 提升建议
- **时光回溯** — 本地持久化练习历史，支持筛选、删除、纠错报告回看
- **进化追踪** — 近 7 次练习驱动雷达图、连续打卡与每日地道表达特训

## 技术架构

| 层级 | 技术栈 | 职责 |
|------|--------|------|
| 前端 | Next.js 15 (App Router) + TypeScript + Tailwind CSS | 场景选择、录音交互、对话流、评测报告、历史管理 |
| 后端 | FastAPI + SSE / WebSocket | 会话管理、LLM 对话、STT / TTS、发音评测、报告生成 |
| AI 服务 | OpenAI-compatible API | 大模型对话、结构化纠错、课后总结 |

## 项目结构

```
.
├── frontend/                 # Next.js 前端
│   └── src/
│       ├── app/              # 页面与布局
│       ├── components/       # UI（对话舱、场景矩阵、报告弹窗等）
│       ├── hooks/            # 录音、TTS、Coach UI
│       ├── lib/              # API、历史存储、设计系统
│       └── types/            # TypeScript 类型
├── backend/                  # FastAPI 后端
│   └── app/
│       ├── api/routes/       # REST 路由（场景、会话、对话）
│       ├── services/         # LLM、STT、TTS、报告、纠错
│       └── prompts/          # 场景 Prompt、纠错、报告 Prompt
├── docs/screenshots/         # README 展示截图
└── README.md
```

## 快速开始

### 1. 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # 填入 API Key 等配置
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

健康检查：<http://localhost:8000/health>

### 2. 前端

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

访问：<http://localhost:3000>

## 环境变量

| 文件 | 说明 |
|------|------|
| `backend/.env` | LLM API Key、模型名称、STT/TTS 配置、CORS 等 |
| `frontend/.env.local` | 可选：`NEXT_PUBLIC_API_URL` 直连后端地址 |

> `.env` 与 `.env.local` 已被 `.gitignore` 忽略，请勿提交敏感信息。

## 开发进度

- [x] 深色赛博 UI 与设计系统（Squircle、TintedOverlay、雷达图）
- [x] 6 场景矩阵 + 盲盒随机进入
- [x] 流式对话 + 并行语法纠错 + 发音评测
- [x] 后端 `/api/session/{id}/end` LLM 课后报告
- [x] 时光回溯（localStorage 持久化、CRUD、场景筛选）
- [x] 进化追踪（近 7 次练习驱动雷达 / 打卡 / 每日特训）
- [ ] 后端数据库持久化与用户账号体系

## License

MIT（Demo 项目，按需调整）
