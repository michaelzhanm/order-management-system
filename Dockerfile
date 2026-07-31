# ====== 阶段1: 构建前端 ======
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ====== 阶段2: 后端运行环境 ======
FROM node:20-alpine AS production

# 安装 better-sqlite3 编译依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 安装后端依赖
COPY server/package.json server/package-lock.json* ./
RUN npm install --production

# 复制后端代码
COPY server/ ./

# 复制前端构建产物
COPY --from=frontend-builder /app/client/dist ./client/dist

# 创建数据目录
RUN mkdir -p /app/data

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/app.db

# 暴露端口
EXPOSE 3000

# 数据持久化
VOLUME ["/app/data"]

# 启动命令
CMD ["node", "src/index.js"]
