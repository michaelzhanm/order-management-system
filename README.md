# 企业订单管理系统

B2B 企业级订单管理系统，支持客户管理、订单管理、合同/发货单/对账单自动生成。

## 技术栈

- 前端：Vue 3 + Vite + Element Plus
- 后端：Node.js + Express + SQLite (better-sqlite3)
- 部署：Docker

## 快速部署（Docker）

### 前提条件
- 已安装 Docker 和 Docker Compose

### 一键启动

```bash
git clone https://github.com/michaelzhanm/order-management-system.git
cd order-management-system
docker compose up -d --build
```

### 访问系统

浏览器打开 `http://localhost:3000`

默认账号：`admin` / `admin123`

### 数据持久化

数据库文件存储在 `./data/app.db`，Docker 重启后数据不会丢失。

### 修改配置

编辑 `docker-compose.yml` 中的环境变量：

```yaml
environment:
  - JWT_SECRET=your-secret-key-change-me-2026  # 修改为随机字符串
```

## 本地开发

### 启动后端

```bash
cd server
npm install
npm run dev
```
后端运行在 http://localhost:3000

### 启动前端

```bash
cd client
npm install
npm run dev
```
前端运行在 http://localhost:5173（自动代理 API 请求到后端）

## 功能模块

- **用户系统**：注册/登录/退出，管理员/普通员工角色
- **客户管理**：公司信息增删改查，模糊搜索
- **订单管理**：订单编号自动生成（拼音首字母+日期），动态明细行，总金额自动计算
- **状态管理**：发货状态、付款状态、开票状态、已付金额
- **合同生成**：订单创建后自动生成合同，支持预览和打印PDF
- **发货单生成**：自动生成发货单，支持预览和打印PDF
- **对账单**：按客户+日期范围汇总订单，计算期初欠款和本期应付
- **搜索筛选**：按公司名/日期范围/状态筛选订单

## 数据备份

```bash
./backup.sh
```
备份文件保存在 `./backups/` 目录。
