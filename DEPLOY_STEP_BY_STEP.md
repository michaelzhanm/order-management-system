# 第一步：Vercel 网页端部署前端（2 分钟）

## 1.1 打开 Vercel 官网

iPad Safari 打开：**https://vercel.com**

## 1.2 登录/注册

点击右上角 **"Sign Up"** 或 **"Log In"**
→ 选择 **"Continue with GitHub"**
→ 授权 Vercel 访问您的 GitHub 仓库

## 1.3 创建新项目

1. 登录后点击右上角 **"Add New..."** → **"Project"**
2. 在仓库列表中找到您刚才推送的 `order-management-system` 仓库
3. 点击 **"Import"** 按钮

## 1.4 配置项目（关键！）

在配置页面，**重要**：

1. **Root Directory** 留空（默认项目根目录）
2. **Framework Preset**：选择 **"Other"**
3. **Build Command**：自动检测或填入 `cd client && npm install && npm run build`
4. **Output Directory**：填入 `client/dist`
5. **Install Command**：填入 `cd client && npm install`
6. **Environment Variables**：
   - Key: `VITE_API_BASE`
   - Value: `https://order-api.up.railway.app/api`（先填占位符，等后端部署好再改）
   - 点击 **"Add"**

## 1.5 开始部署

点击右下角蓝色大按钮 **"Deploy"**
→ 等待 1-3 分钟（Vercel 会自动安装依赖、构建前端）
→ 看到 **"Congratulations!"** 页面 = 成功！

## 1.6 记录前端地址

在成功页面复制您的 Vercel 地址，格式类似：
```
https://order-management-system-xxx.vercel.app
```

---

# 第二步：Railway 部署后端（3 分钟）

## 2.1 打开 Railway 官网

iPad Safari 打开：**https://railway.app**

## 2.2 登录/注册

点击 **"Login"**
→ 选择 **"Continue with GitHub"**
→ 授权 Railway 访问 GitHub

## 2.3 创建新项目

1. 点击左上角 **"New Project"** → **"Deploy from GitHub repo"**
2. 选择您的 `order-management-system` 仓库
3. **Root Directory**：填入 `server`（只部署后端）
4. 点击 **"Deploy Now"**

## 2.4 配置环境变量

1. 进入项目后，点击左侧 **"Variables"** 标签
2. 添加以下变量（每行一个 Key + Value）：

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3000` | 端口 |
| `JWT_SECRET` | `my-secret-key-2026` | **密码加密用，请记下这个值** |
| `DB_PATH` | `/data/app.db` | 数据库路径 |

3. 添加完后 Railway 会自动重新部署

## 2.5 配置持久化存储（重要！）

SQLite 数据需要持久化，否则每次重启数据会丢失：

1. 点击左侧 **"Settings"** → **"Network"**
2. 找到 **"Volumes"** 部分，点击 **"Add Volume"**
3. 填写：
   - **Name**: `data`
   - **Mount Path**: `/data`
   - **Size**: 选最小的（如 1GB，免费版足够）
4. 点击 **"Add Volume"** 保存

## 2.6 记录后端地址

点击顶部 **"Settings"** → **"Network"**，在 **"Public Network"** 部分找到您的公网地址，格式：
```
https://order-api.up.railway.app
```
复制这个地址！

---

# 第三步：更新 Vercel 前端的 API 地址（1 分钟）

## 3.1 回到 Vercel 项目

打开 Vercel → 点击您的 `order-management-system` 项目

## 3.2 更新环境变量

1. 点击顶部 **"Settings"**
2. 点击左侧 **"Environment Variables"**
3. 找到 `VITE_API_BASE` 变量，点击编辑
4. 把 Value 改成刚才 Railway 的后端地址：
   ```
   https://order-api.up.railway.app/api
   ```
5. 保存

## 3.3 重新部署

1. 回到 **"Deployments"** 标签
2. 点击最新的部署记录
3. 点击右上角 **"..."** → **"Redeploy"**
4. 等待 1-2 分钟重新部署完成

---

# 第四步：在 iPad 上访问使用

## 4.1 打开系统

在 iPad Safari 打开 Vercel 的前端地址：
```
https://order-management-system-xxx.vercel.app
```

## 4.2 登录

- 用户名：`admin`
- 密码：`admin123`

## 4.3 修改默认密码

第一次登录后，点击右上角头像 → "修改密码"

---

# 常见问题

**Q: Vercel 构建失败？**
A: 检查 Root Directory 是否为空，Build Command 是否正确。可以把错误截图发给我。

**Q: 页面能打开但接口报错？**
A: 说明前端连不到后端。检查 Vercel 的 VITE_API_BASE 环境变量是否正确。

**Q: 数据保存后又丢失？**
A: 说明 Railway 的持久化存储卷没配置。按步骤 2.5 重新配置。

**Q: 如何更新代码？**
A: 在电脑上 push 到 GitHub 后，Vercel 和 Railway 会自动检测变更并重新部署。
