// Vercel Serverless 入口
// 将 Express 应用包装为 Vercel Serverless 函数
// 注意：Vercel Serverless 的文件系统 /tmp 在实例重启后会清空
// 生产环境建议使用 Railway/Render，此入口主要用于 Demo 或低流量场景

import path from 'path';
import fs from 'fs';

// 确保 /tmp 数据目录存在（Vercel Serverless 唯一可写目录）
const tmpDir = '/tmp/order-data';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// 设置数据库路径为 /tmp（通过环境变量覆盖）
process.env.DB_PATH = process.env.DB_PATH || path.join(tmpDir, 'app.db');

// 设置为 Vercel 环境
process.env.VERCEL_ENV = 'production';

// 动态导入 Express 应用
const { default: app } = await import('./src/index.js');

export default app;
