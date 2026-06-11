# SceneSpeak2 AI

SceneSpeak2 AI 是一个面向英语口语练习的 AI 场景陪练应用。项目围绕“AI 英语口语陪练”题目开发，支持自由对话、语法专项、发音训练、词汇表达、流利度训练和真实场景角色扮演。

## 项目目录

```text
scenespeak2-ai/
  index.js              # Express + Socket.IO 后端入口
  views/index.html      # 前端页面
  public/js/script.js   # 核心交互、语音识别、对话逻辑
  public/css/style.css  # 页面样式
  package.json          # Node.js 依赖与启动脚本
  env.example           # 环境变量示例
```

## 核心功能

- 场景陪练：面试、点餐、会议、旅行、购物、社交等真实情境。
- 实时口语输入：浏览器麦克风录音与语音识别。
- 识别文本确认：用户可手动修正识别结果后再发送，降低语音识别误差影响。
- DeepSeek 对话：后端接入 DeepSeek API，按不同模式生成 AI 导师回复。
- 语法专项：输出纠错、解释和练习建议。
- 发音反馈：提供发音评分展示与后续音频级评测接口。
- 课后总结：统计对话轮次、词数、分数和下一步建议。

## 技术栈与依赖

- Node.js
- Express
- Socket.IO
- Axios
- Helmet
- express-rate-limit
- Browser Web Speech API
- Browser Speech Synthesis API
- DeepSeek Chat API

第三方库用于 Web 服务、实时通信、安全头、接口调用和浏览器语音能力。原创功能主要集中在口语陪练流程、场景模式、语法专项 prompt、识别文本确认、学习反馈和课后总结。

## 启动方式

进入项目目录：

```bash
cd scenespeak2-ai
npm install
```

创建 `.env`：

```bash
cp env.example .env
```

配置环境变量：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
AI_API_URL=https://api.deepseek.com/chat/completions
AI_MODEL=deepseek-chat
PORT=3010
NODE_ENV=development
```

启动：

```bash
PORT=3010 npm start
```

浏览器访问：

```text
http://localhost:3010
```

如果服务运行在远程服务器上，建议使用 SSH 本地端口转发，以保证浏览器麦克风权限正常：

```bash
ssh -L 3011:127.0.0.1:3010 user@server
```

然后访问：

```text
http://localhost:3011
```

## Demo 视频

待补充：请将 demo 视频上传至 bilibili、网盘或其他可访问平台，并在此处填写链接。

## 开发说明

本项目当前版本使用浏览器 Web Speech API 做语音转文本。该能力依赖浏览器实现，可能受网络和浏览器环境影响。后续计划接入后端 ASR，例如 Whisper、FunASR 或云语音识别服务，以提升识别稳定性和准确率。

