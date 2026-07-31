#!/bin/bash
# 一键 Vercel + Railway 部署脚本
# 前置条件：已安装 Node.js 20+, vercel CLI, railway CLI

set -e

echo "========================================="
echo "  企业订单管理系统 - 一键部署脚本"
echo "========================================="
echo ""

# 检查 CLI 工具
command -v vercel >/dev/null 2>&1 || { echo "❌ 请先安装 vercel CLI: npm install -g vercel"; exit 1; }
command -v railway >/dev/null 2>&1 || { echo "❌ 请先安装 railway CLI: npm install -g @railway/cli"; exit 1; }

# ========== 步骤 1：部署后端到 Railway ==========
echo ""
echo "📦 [1/2] 部署后端 API 到 Railway..."
cd server

if [ ! -f "railway.toml" ]; then
  echo "🚀 首次部署：请按提示登录 Railway 并选择/创建项目"
  railway init
fi

echo "🔧 设置环境变量..."
# 生成随机 JWT 密钥
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set NODE_ENV=production
railway variables set DB_PATH=/data/app.db

echo "📤 推送后端代码..."
railway up

BACKEND_URL=$(railway status | grep "URL" | awk '{print $2}')
echo "✅ 后端部署成功: $BACKEND_URL"

cd ..

# ========== 步骤 2：部署前端到 Vercel ==========
echo ""
echo "🎨 [2/2] 部署前端到 Vercel..."
cd client

echo "🔧 配置生产环境 API 地址..."
echo "VITE_API_BASE=${BACKEND_URL}/api" > .env.production

echo "📤 推送前端代码到 Vercel..."
echo "⚠️  请在 Vercel 面板确认部署，或按以下说明操作："
echo ""
echo "   cd client"
echo "   npx vercel --prod"
echo ""
echo "   部署时 Vercel 会自动读取 vercel.json 和 .env.production"

echo ""
echo "========================================="
echo "  部署完成！"
echo ""
echo "  后端 API: $BACKEND_URL"
echo "  JWT 密钥: $JWT_SECRET (已存于 Railway)"
echo ""
echo "  在 Vercel 部署前端后即可 iPad 访问"
echo "========================================="
