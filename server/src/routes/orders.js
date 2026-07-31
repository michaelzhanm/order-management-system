import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { generateOrderNo } from '../utils/orderNo.js';

const router = Router();

// 获取订单列表（支持搜索、筛选、分页）
router.get('/', authRequired, (req, res) => {
  const {
    search, startDate, endDate,
    delivery_status, payment_status, invoice_status,
    customer_id,
    page = 1, pageSize = 20,
  } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (c.company_name LIKE ? OR o.order_no LIKE ?)';
    const kw = `%${search}%`;
    params.push(kw, kw);
  }
  if (startDate) { where += ' AND o.order_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND o.order_date <= ?'; params.push(endDate); }
  if (delivery_status) { where += ' AND o.delivery_status = ?'; params.push(delivery_status); }
  if (payment_status) { where += ' AND o.payment_status = ?'; params.push(payment_status); }
  if (invoice_status) { where += ' AND o.invoice_status = ?'; params.push(invoice_status); }
  if (customer_id) { where += ' AND o.customer_id = ?'; params.push(customer_id); }

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${where}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT o.*, c.company_name, c.contact_name, u.real_name as creator_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.created_by = u.id
    ${where}
    ORDER BY o.order_date DESC, o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 获取订单详情（含明细）
router.get('/:id', authRequired, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.company_name, c.contact_name, c.phone as customer_phone,
           c.address as customer_address, c.tax_number as customer_tax_number,
           c.initial_debt, u.real_name as creator_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort_order').all(req.params.id);
  const logs = db.prepare(`
    SELECT l.*, u.real_name as user_name FROM order_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.order_id = ? ORDER BY l.created_at DESC
  `).all(req.params.id);

  res.json({ ...order, items, logs });
});

// 创建订单
router.post('/', authRequired, (req, res) => {
  const { customer_id, order_date, remark, items } = req.body;
  if (!customer_id) return res.status(400).json({ error: '请选择客户' });
  if (!order_date) return res.status(400).json({ error: '请选择下单日期' });
  if (!items || items.length === 0) return res.status(400).json({ error: '请添加至少一条订单明细' });

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(400).json({ error: '客户不存在' });

  // 获取乙方公司名
  const companySetting = db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get();
  const companyName = companySetting?.value || '我公司';

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => {
    const subtotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + subtotal;
  }, 0);

  const orderNo = generateOrderNo(customer.company_name, companyName);

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, customer_id, order_date, total_amount, remark, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_name, specification, unit, quantity, unit_price, subtotal, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare('INSERT INTO order_logs (order_id, user_id, action, detail) VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    const result = insertOrder.run(orderNo, customer_id, order_date, totalAmount, remark || '', req.user.id);
    const orderId = result.lastInsertRowid;
    items.forEach((item, idx) => {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      insertItem.run(orderId, item.product_name, item.specification || '', item.unit || '',
        item.quantity || 0, item.unit_price || 0, subtotal, idx);
    });
    insertLog.run(orderId, req.user.id, '创建订单', `创建订单 ${orderNo}`);
    return orderId;
  });

  const orderId = tx();
  res.json({ id: orderId, order_no: orderNo, message: '订单创建成功' });
});

// 更新订单（基本信息+明细）
router.put('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const { customer_id, order_date, remark, items } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const totalAmount = (items || []).reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0);
  }, 0);

  const updateOrder = db.prepare(`
    UPDATE orders SET customer_id=?, order_date=?, remark=?, total_amount=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `);
  const deleteItems = db.prepare('DELETE FROM order_items WHERE order_id = ?');
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_name, specification, unit, quantity, unit_price, subtotal, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare('INSERT INTO order_logs (order_id, user_id, action, detail) VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    updateOrder.run(customer_id ?? order.customer_id, order_date ?? order.order_date, remark ?? order.remark, totalAmount, id);
    if (items) {
      deleteItems.run(id);
      items.forEach((item, idx) => {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        insertItem.run(id, item.product_name, item.specification || '', item.unit || '',
          item.quantity || 0, item.unit_price || 0, subtotal, idx);
      });
    }
    insertLog.run(id, req.user.id, '编辑订单', '编辑订单基本信息或明细');
  });
  tx();
  res.json({ message: '订单更新成功' });
});

// 更新订单状态（发货/付款/开票状态、已付金额）
router.patch('/:id/status', authRequired, (req, res) => {
  const { id } = req.params;
  const { delivery_status, payment_status, paid_amount, invoice_status } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  if (paid_amount !== undefined && paid_amount > order.total_amount) {
    return res.status(400).json({ error: '已付金额不能超过订单总金额' });
  }

  const updates = [];
  const params = [];
  const changes = [];

  if (delivery_status !== undefined) { updates.push('delivery_status=?'); params.push(delivery_status); changes.push(`发货状态→${delivery_status}`); }
  if (payment_status !== undefined) { updates.push('payment_status=?'); params.push(payment_status); changes.push(`付款状态→${payment_status}`); }
  if (paid_amount !== undefined) { updates.push('paid_amount=?'); params.push(paid_amount); changes.push(`已付金额→${paid_amount}`); }
  if (invoice_status !== undefined) { updates.push('invoice_status=?'); params.push(invoice_status); changes.push(`开票状态→${invoice_status}`); }
  updates.push("updated_at=datetime('now','localtime')");
  params.push(id);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id=?`).run(...params);
    db.prepare('INSERT INTO order_logs (order_id, user_id, action, detail) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, '更新状态', changes.join('; '));
  });
  tx();
  res.json({ message: '状态更新成功' });
});

// 删除订单
router.delete('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  res.json({ message: '订单删除成功' });
});

// 对账单：按客户+日期范围汇总
router.get('/statement/:customerId', authRequired, (req, res) => {
  const { customerId } = req.params;
  const { startDate, endDate } = req.query;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) return res.status(404).json({ error: '客户不存在' });

  let where = 'WHERE customer_id = ?';
  const params = [customerId];
  if (startDate) { where += ' AND order_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND order_date <= ?'; params.push(endDate); }

  const orders = db.prepare(`
    SELECT id, order_no, order_date, total_amount, paid_amount,
           delivery_status, payment_status, invoice_status
    FROM orders ${where} ORDER BY order_date
  `).all(...params);

  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid = orders.reduce((s, o) => s + o.paid_amount, 0);
  const initialDebt = customer.initial_debt || 0;
  const balanceDue = initialDebt + totalAmount - totalPaid;

  res.json({
    customer,
    orders,
    summary: {
      initial_debt: initialDebt,
      total_amount: totalAmount,
      total_paid: totalPaid,
      balance_due: balanceDue,
      order_count: orders.length,
    },
    dateRange: { startDate: startDate || '', endDate: endDate || '' },
  });
});

export default router;
