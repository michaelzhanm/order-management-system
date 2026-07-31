# Render.com 一键部署（免费额度够用）

## 后端部署到 Render.com

### 1. 创建 Render 账号

访问 [render.com](https://render.com) 用 GitHub 账号登录

### 2. 创建 Web Service

1. 点击 **"New +"** → **"Web Service"**
2. 选择 GitHub 仓库
3. 配置：
   - **Root Directory**: `server`（只部署后端）
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Environment**: Node 20

4. 添加环境变量：
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `JWT_SECRET` | `改成你的密钥` |
   | `DB_PATH` | `./data/app.db` |

5. **重要：配置磁盘**
   - 进入服务 → **Environment** → **Disk**
   - 点击 **"Add Disk"**
   - Name: `data`
   - Mount Path: `data`
   - Size: 最小 512MB 即可

6. 点击 **"Create Web Service"**，等待部署完成

### 3. 前端部署到 Vercel

```bash
cd client

# 设置生产环境 API 地址
echo "VITE_API_BASE=https://your-render-service.onrender.com/api" > .env.production

# 部署
npx vercel --prod
```

### 成本估算
- Render 后端：免费（750小时/月）
- Vercel 前端：免费
- 总计：**0 元/月**
