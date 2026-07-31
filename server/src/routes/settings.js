import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

// 获取系统设置
router.get('/', authRequired, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

// 更新系统设置（仅管理员）
router.put('/', authRequired, adminRequired, (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) {
      stmt.run(key, String(value ?? ''));
    }
  });
  tx(Object.entries(req.body));
  res.json({ message: '设置保存成功' });
});

export default router;
