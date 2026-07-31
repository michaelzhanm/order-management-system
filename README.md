# 企业订单管理系统

一套面向 B2B 业务场景的订单管理系统，支持 PC、iPad、手机多端访问。

## ✨ 功能特性

- 👤 **用户系统**：注册登录、角色权限（管理员/员工）、密码修改
- 🏢 **客户管理**：客户信息增删改查、初始欠款设置
- 📦 **订单管理**：创建订单、动态明细行、自动编号、状态跟踪
- 📄 **合同生成**：自动生成购销合同、A4 预览/打印
- 🚚 **发货单生成**：自动生成发货单、物流信息
- 💰 **对账单**：按客户汇总、期间应付计算、对账 PDF
- 📊 **数据统计**：仪表盘、订单趋势、未收款统计
- 📱 **响应式设计**：完美支持 iPad Safari、手机浏览器

## 🚀 快速部署（iPad 远程访问）

### 方式一：云服务器部署（推荐）

#### 步骤 1：购买云服务器

推荐配置（按需选择）：
| 云服务商 | 最低配置 | 参考价格 |
|---------|---------|---------|
| 阿里云 ECS | 1核2G | ~60元/月 |
| 腾讯云 CVM | 1核2G | ~60元/月 |
| 华为云 ECS | 1核2G | ~50元/月 |

**操作系统选择**：Ubuntu 22.04 LTS（或 CentOS 7+/Debian 12）

#### 步骤 2：安装 Docker

SSH 连接服务器后执行：

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash
docker compose version

# 如果 docker compose 不可用，手动安装：
# apt update && apt install -y docker-compose-plugin
```

#### 步骤 3：上传项目到服务器

```bash
# 在本地机器执行（替换为你的服务器 IP）
scp -r ./order-management-system root@你的服务器IP:/opt/

# 或在服务器上直接 git clone
# git clone https://github.com/your-repo/order-management-system.git /opt/
```

#### 步骤 4：配置并启动

```bash
cd /opt/order-management-system

# 修改 JWT 密钥（务必修改！）
vim docker-compose.yml
# 找到 JWT_SECRET=your-secret-key-change-me-2026，替换为随机字符串

# 创建数据目录
mkdir -p data

# 一键启动
docker compose up -d
```

#### 步骤 5：开放端口

```bash
# Ubuntu (ufw)
ufw allow 3000/tcp
ufw allow 80/tcp    # 如使用 Nginx

# CentOS (firewalld)
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload
```

**⚠️ 重要**：还需要在云服务商控制台的**安全组**中开放对应端口！

#### 步骤 6：iPad 访问

在 iPad Safari 中输入：
```
http://你的服务器IP:3000
```

登录账号：`admin` / `admin123`（首次登录后请立即修改密码）

---

### 方式二：局域网快速部署（自用测试）

如果只想在家庭/办公室局域网内使用：

```bash
# 在电脑上执行（确保 iPad 和电脑在同一 WiFi）
cd order-management-system
npm install --prefix server && npm install --prefix client
npm run build --prefix client
cd server && node src/index.js
```

然后 iPad Safari 访问：`http://电脑IP:3000`

**获取电脑 IP**：
```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows (PowerShell)
ipconfig | findstr /i "IPv4"
```

---

### 方式三：带域名和 HTTPS（生产环境推荐）

```bash
# 1. 准备域名并解析到服务器 IP
# 2. 修改 docker-compose.yml 的 JWT_SECRET
# 3. 启动 Nginx 反代
docker compose --profile web up -d

# 4. 配置 SSL 证书（可选，推荐用 Let's Encrypt）
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

然后 iPad 访问：`https://your-domain.com`

---

## 📱 iPad 使用指南

### iPad Safari 最佳实践

1. **添加到主屏幕**：在 Safari 中打开网页 → 分享 → "添加到主屏幕"，获得全屏体验
2. **横屏模式**：订单列表、对账单等宽页面建议横屏使用
3. **打印 PDF**：合同/发货单/对账单预览页点击"打印/保存PDF"按钮，可直接生成 PDF
4. **操作习惯**：
   - 左滑订单列表项可快速删除
   - 下拉刷新数据
   - 双指缩放表格查看详情

### iPad 键盘快捷操作

- `Cmd + F`：搜索
- `Cmd + R`：刷新
- `双击`：表格行进入详情

---

## 📁 数据备份

### 自动备份（推荐）

```bash
# 设置 crontab 定时任务
crontab -e

# 每天凌晨 3 点自动备份
0 3 * * * cd /opt/order-management-system && bash backup.sh

# 每周日备份并保留 30 天
```

### 手动备份

```bash
# 备份数据库
docker exec order-management-system sqlite3 /app/data/app.db ".backup /app/data/backup_$(date +%Y%m%d).db"

# 或直接复制文件
cp /opt/order-management-system/data/app.db /backup/
```

---

## 🔧 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新并重建
docker compose up -d --build

# 进入容器调试
docker exec -it order-management-system sh
```

---

## 🏗️ 项目结构

```
order-management-system/
├── server/          # 后端 API (Node.js + Express + SQLite)
├── client/          # 前端界面 (Vue 3 + Element Plus)
├── nginx/           # Nginx 配置
├── data/            # 数据库文件（持久化存储）
├── backup.sh        # 备份脚本
├── Dockerfile       # Docker 构建文件
└── docker-compose.yml  # 一键部署配置
```

## 🛡️ 安全建议

1. **首次登录**后立即修改默认密码（admin / admin123）
2. 修改 `docker-compose.yml` 中的 `JWT_SECRET` 为强随机字符串
3. 生产环境建议使用 HTTPS
4. 定期备份数据库
5. 限制服务器安全组仅开放必要端口
6. 不要将 `data/` 目录提交到 Git

## ❓ 常见问题

**Q: iPad 访问页面空白？**
A: 检查服务器防火墙和云服务商安全组是否开放 3000 端口。

**Q: 移动端布局错乱？**
A: 确保 iPad Safari 为最新版本（iOS 14+），或尝试使用横屏模式。

**Q: PDF 下载后中文乱码？**
A: PDF 使用系统打印功能生成，iPad Safari 原生支持中文渲染。如果问题持续，可改用电脑端 Chrome 打印。

**Q: 数据如何迁移到新服务器？**
A: 只需复制 `data/` 目录下的 `app.db` 文件到新服务器的相同位置即可。

---

© 2026 企业订单管理系统
