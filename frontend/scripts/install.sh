#!/usr/bin/env bash
# SceneSpeak AI 前端安装脚本 — 使用国内镜像，避免 npm install 卡住
set -e

cd "$(dirname "$0")"

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo "Registry: $(npm config get registry)"

# 若未配置镜像，使用 npmmirror
if ! npm config get registry | grep -q npmmirror; then
  npm config set registry https://registry.npmmirror.com
fi

export npm_config_fetch_timeout=600000
export npm_config_fetch_retries=5

echo "开始安装依赖（首次约 3-10 分钟，请耐心等待）..."
npm install --prefer-offline --no-audit --no-fund --loglevel=verbose

echo ""
echo "安装完成。启动开发服务器："
echo "  npm run dev"
