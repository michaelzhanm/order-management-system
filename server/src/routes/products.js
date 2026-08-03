import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// 查询所有产品（不分页，用于下拉选择和管理页列表）
router.get('/', authRequired, (req, res) => {
  const { search } = req.query;
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE name LIKE ? OR specification LIKE ?';
    const kw = `%${search}%`;
    params.push(kw, kw);
  }
  const list = db.prepare(`
    SELECT * FROM products ${where}
    ORDER BY updated_at DESC, id DESC
  `).all(...params);
  res.json({ list });
});

// 新增产品
router.post('/', authRequired, (req, res) => {
  const { name, specification, unit, unit_price } = req.body;
  if (!name) return res.status(400).json({ error: '请输入产品名称' });
  const info = db.prepare(`
    INSERT INTO products (name, specification, unit, unit_price)
    VALUES (?, ?, ?, ?)
  `).run(
    name.trim(),
    specification || '',
    unit || '',
    Number(unit_price) || 0,
  );
  res.json({ id: info.lastInsertRowid, message: '产品已添加' });
});

// 修改产品
router.put('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const { name, specification, unit, unit_price } = req.body;
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: '产品不存在' });
  if (!name) return res.status(400).json({ error: '请输入产品名称' });
  db.prepare(`
    UPDATE products SET
      name = ?, specification = ?, unit = ?, unit_price = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    name.trim(),
    specification || '',
    unit || '',
    Number(unit_price) || 0,
    id,
  );
  res.json({ message: '产品已更新' });
});

// 删除产品
router.delete('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: '产品不存在' });
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: '产品已删除' });
});

export default router;
