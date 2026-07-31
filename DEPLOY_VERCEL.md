# Railway 一键部署

## 方式一：通过 GitHub 自动部署（推荐）

1. 将项目推送到 GitHub
2. 在 [Railway.app](https://railway.app) 登录
3. 点击 **"New Project"** → **"Deploy from GitHub repo"**
4. 选择本仓库，Railway 会自动检测为 Node.js 项目

### 环境变量配置

在 Railway 项目面板的 **Variables** 标签页添加：

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3000` | 端口（Railway 自动分配） |
| `JWT_SECRET` | `your-secret-key-change-me-2026` | **务必修改为强随机字符串** |
| `DB_PATH` | `/data/app.db` | 使用 Railway 持久化存储卷 |

### 配置持久化存储（重要！）

SQLite 数据库需要持久化存储，否则重启后数据会丢失：

1. 进入项目 → **Settings** → **Network** → **Volumes**
2. 点击 **"Add Volume"**
3. Name: `data`
4. Mount Path: `/data`
5. Size: 选最小即可（如 1GB）

## 方式二：Vercel 前端 + Railway 后端（完整组合）

### 步骤 1：部署后端到 Railway

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 在 server/ 目录下初始化
cd server
railway init

# 4. 设置环境变量（同上）
railway variables set JWT_SECRET=your-secret-key-change-me
railway variables set DB_PATH=/data/app.db
railway variables set NODE_ENV=production

# 5. 部署
railway up
```

记录部署成功后的域名，例如：`https://order-api.up.railway.app`

### 步骤 2：部署前端到 Vercel

```bash
# 1. 在 client/ 目录下
cd client

# 2. 创建 .env.production 文件
echo "VITE_API_BASE=https://order-api.up.railway.app/api" > .env.production

# 3. 部署到 Vercel
npx vercel --prod
```

Vercel 会自动构建前端并部署。

### 完成！

现在：
- 前端：`https://your-project.vercel.app`（全球 CDN，自动 HTTPS）
- 后端：`https://order-api.up.railway.app`（Node.js 运行时 + SQLite 持久化）
- iPad 访问 Vercel 地址即可使用
