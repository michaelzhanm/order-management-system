import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// 获取客户列表（支持搜索、分页）
router.get('/', authRequired, (req, res) => {
  const { search, page = 1, pageSize = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE company_name LIKE ? OR contact_name LIKE ? OR phone LIKE ?';
    const kw = `%${search}%`;
    params.push(kw, kw, kw);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${where}`).get(...params).count;
  const list = db.prepare(`
    SELECT c.*, u.real_name as creator_name
    FROM customers c LEFT JOIN users u ON c.created_by = u.id
    ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 获取单个客户
router.get('/:id', authRequired, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: '客户不存在' });
  res.json(customer);
});

// 新增客户
router.post('/', authRequired, (req, res) => {
  const { company_name, contact_name, phone, address, tax_number, initial_debt } = req.body;
  if (!company_name) return res.status(400).json({ error: '公司名称不能为空' });
  const existing = db.prepare('SELECT id FROM customers WHERE company_name = ?').get(company_name);
  if (existing) return res.status(400).json({ error: '公司名称已存在' });
  const result = db.prepare(`
    INSERT INTO customers (company_name, contact_name, phone, address, tax_number, initial_debt, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(company_name, contact_name || '', phone || '', address || '', tax_number || '', initial_debt || 0, req.user.id);
  res.json({ id: result.lastInsertRowid, message: '客户创建成功' });
});

// 编辑客户
router.put('/:id', authRequired, (req, res) => {
  const { company_name, contact_name, phone, address, tax_number, initial_debt } = req.body;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: '客户不存在' });
  if (company_name && company_name !== customer.company_name) {
    const dup = db.prepare('SELECT id FROM customers WHERE company_name = ? AND id != ?').get(company_name, req.params.id);
    if (dup) return res.status(400).json({ error: '公司名称已存在' });
  }
  db.prepare(`
    UPDATE customers SET company_name=?, contact_name=?, phone=?, address=?, tax_number=?, initial_debt=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(
    company_name ?? customer.company_name,
    contact_name ?? customer.contact_name,
    phone ?? customer.phone,
    address ?? customer.address,
    tax_number ?? customer.tax_number,
    initial_debt ?? customer.initial_debt,
    req.params.id
  );
  res.json({ message: '客户更新成功' });
});

// 删除客户
router.delete('/:id', authRequired, (req, res) => {
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?').get(req.params.id).count;
  if (orderCount > 0) {
    return res.status(400).json({ error: `该客户关联了 ${orderCount} 个订单，无法删除` });
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ message: '客户删除成功' });
});

export default router;
