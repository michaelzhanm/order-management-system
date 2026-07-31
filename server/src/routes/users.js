import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

// 获取所有用户（仅管理员）
router.get('/', authRequired, adminRequired, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, real_name, phone, must_change_password, created_at
    FROM users ORDER BY created_at
  `).all();
  res.json(users);
});

// 创建用户（仅管理员）
router.post('/', authRequired, adminRequired, (req, res) => {
  const { username, password, role, real_name, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, real_name, phone)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, hash, role || 'EMPLOYEE', real_name || '', phone || '');
  res.json({ id: result.lastInsertRowid, message: '用户创建成功' });
});

// 更新用户（仅管理员）
router.put('/:id', authRequired, adminRequired, (req, res) => {
  const { id } = req.params;
  const { role, real_name, phone, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }
  db.prepare('UPDATE users SET role = ?, real_name = ?, phone = ? WHERE id = ?')
    .run(role || user.role, real_name ?? user.real_name, phone ?? user.phone, id);
  res.json({ message: '用户更新成功' });
});

// 删除用户（仅管理员）
router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: '不能删除当前登录用户' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  // 检查是否最后一个管理员
  if (user) {
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (u.role === 'ADMIN') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'").get();
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: '不能删除最后一个管理员' });
      }
    }
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: '用户删除成功' });
});

export default router;
