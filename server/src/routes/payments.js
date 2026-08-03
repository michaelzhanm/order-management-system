import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// 查询某客户的付款记录（支持日期范围）
router.get('/', authRequired, (req, res) => {
  const { customer_id, startDate, endDate } = req.query;
  if (!customer_id) return res.status(400).json({ error: '缺少客户ID' });

  let where = 'WHERE customer_id = ?';
  const params = [customer_id];
  if (startDate) { where += ' AND payment_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND payment_date <= ?'; params.push(endDate); }

  const list = db.prepare(`
    SELECT p.*, u.real_name as creator_name
    FROM payments p LEFT JOIN users u ON p.created_by = u.id
    ${where} ORDER BY payment_date DESC, p.id DESC
  `).all(...params);

  const total = list.reduce((s, p) => s + p.amount, 0);
  res.json({ list, total });
});

// 新增付款单
router.post('/', authRequired, (req, res) => {
  const { customer_id, amount, payment_date, remark } = req.body;
  if (!customer_id) return res.status(400).json({ error: '请选择客户' });
  if (!amount || amount <= 0) return res.status(400).json({ error: '付款金额必须大于0' });
  if (!payment_date) return res.status(400).json({ error: '请选择付款日期' });

  const info = db.prepare(`
    INSERT INTO payments (customer_id, amount, payment_date, remark, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(customer_id, amount, payment_date, remark || '', req.user.id);

  res.json({ id: info.lastInsertRowid, message: '付款单已登记' });
});

// 删除付款单
router.delete('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  if (!pay) return res.status(404).json({ error: '付款单不存在' });
  db.prepare('DELETE FROM payments WHERE id = ?').run(id);
  res.json({ message: '付款单已删除' });
});

export default router;
