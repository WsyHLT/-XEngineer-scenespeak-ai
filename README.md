# SceneSpeak AI — AI 英语口语陪练 Demo

一款面向真实场景的 AI 英语口语练习工具，支持场景化对话、实时语音交互、发音评测、语法纠错与课后总结。

## 技术架构

| 层级 | 技术栈 | 职责 |
|------|--------|------|
| 前端 | Next.js (App Router) + TypeScript + Tailwind CSS | 场景选择、录音交互、对话流展示、评测报告可视化 |
| 后端 | FastAPI + WebSockets | 实时语音流、LLM 对话、STT / TTS、发音评测 |
| AI 服务 | OpenAI-compatible API | 大模型对话、语音转文字、文字转语音 |

## 项目结构

```
.
├── frontend/                    # Next.js 前端
│   ├── src/
│   │   ├── app/                 # App Router 页面与布局
│   │   ├── components/          # UI 组件（场景卡片、对话气泡、录音按钮等）
│   │   ├── hooks/               # 自定义 Hooks（WebSocket、MediaRecorder 等）
│   │   ├── lib/                 # API 客户端、工具函数
│   │   └── types/               # TypeScript 类型定义
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py              # 应用入口
│   │   ├── core/
│   │   │   └── config.py        # 环境变量与配置
│   │   ├── api/                 # REST & WebSocket 路由
│   │   ├── services/            # STT / TTS / LLM / 发音评测 / 纠错
│   │   └── models/              # Pydantic 数据模型
│   ├── requirements.txt
│   └── .env.example
│
├── .gitignore
└── README.md
```

## 核心功能模块（规划）

### 前端

- **场景选择**：面试、点餐、会议等预设场景
- **实时对话**：WebSocket 双向通信，展示对话流
- **录音交互**：浏览器 MediaRecorder 采集音频并推送
- **评测报告**：发音分数、语法纠错、课后总结可视化

### 后端

- **WebSocket 网关**：`/ws/conversation` 实时语音与文本流
- **STT 模块**：语音转文字（Whisper 等）
- **LLM 模块**：场景化角色扮演与对话生成
- **TTS 模块**：AI 回复语音合成
- **发音评测**：准确度、流利度、完整度评分
- **纠错与总结**：语法/表达纠错、会话结束生成报告

## 快速开始

### 1. 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # 填入 API Key 等配置
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：http://localhost:8000/health

### 2. 前端

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

访问：http://localhost:3000

## 环境变量

| 文件 | 说明 |
|------|------|
| `backend/.env` | OpenAI API Key、模型名称、CORS 等 |
| `frontend/.env.local` | 后端 API / WebSocket 地址 |

> `.env` 与 `.env.local` 已被 `.gitignore` 忽略，请勿提交敏感信息。

## 开发阶段

- [x] 项目骨架与基础配置
- [ ] 后端 WebSocket 与 STT / TTS / LLM 集成
- [ ] 前端场景选择与对话界面
- [ ] 发音评测与纠错模块
- [ ] 课后总结与可视化报告

---

*当前为 Demo 初始化阶段，后续功能按模块迭代开发。*
