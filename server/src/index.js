import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import customerRoutes from './routes/customers.js';
import orderRoutes from './routes/orders.js';
import documentRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import paymentRoutes from './routes/payments.js';
import exportRoutes from './routes/exports.js';
import productRoutes from './routes/products.js';
import shippingRoutes from './routes/shipping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// 初始化数据库
initDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipping', shippingRoutes);

// 生产环境：提供静态前端文件
// Docker 容器: /app/src -> /app/client/dist
// 本地开发: /server/src -> /client/dist
let clientDist = path.join(__dirname, '../../client/dist');
if (!fs.existsSync(clientDist)) {
  clientDist = path.join(__dirname, '../client/dist');
}
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA 回退：所有非 /api 路由都返回 index.html
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 企业订单管理系统已启动: http://localhost:${PORT}`);
  console.log(`[Server] API 文档: http://localhost:${PORT}/api/auth/me (需认证)`);
});
