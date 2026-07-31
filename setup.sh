#!/bin/bash
# Replit 一键启动脚本
# 首次运行自动安装依赖 + 构建前端，后续直接启动

if [ ! -d "server/node_modules" ]; then
  echo "=== 首次运行：安装后端依赖 ==="
  cd server && npm install && cd ..
fi

if [ ! -d "client/dist" ]; then
  echo "=== 首次运行：安装前端依赖并构建 ==="
  cd client && npm install && npm run build && cd ..
fi

echo "=== 启动服务器 ==="
cd server && npm start
