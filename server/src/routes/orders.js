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

// 获取订单详情（含明细+发货记录）
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

  // 每个明细附带已发/未发数量
  const items = db.prepare(`
    SELECT oi.*,
           COALESCE((SELECT SUM(quantity) FROM shipping_records sr WHERE sr.order_item_id = oi.id), 0) AS shipped_qty,
           (oi.quantity - COALESCE((SELECT SUM(quantity) FROM shipping_records sr WHERE sr.order_item_id = oi.id), 0)) AS remaining_qty
    FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.sort_order
  `).all(req.params.id);

  const shipping = db.prepare(`
    SELECT sr.*,
           oi.product_name, oi.specification, oi.unit, oi.quantity as total_quantity,
           u.real_name as creator_name
    FROM shipping_records sr
    LEFT JOIN order_items oi ON sr.order_item_id = oi.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.order_id = ?
    ORDER BY sr.shipped_date DESC, sr.created_at DESC
  `).all(req.params.id);

  const logs = db.prepare(`
    SELECT l.*, u.real_name as user_name FROM order_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.order_id = ? ORDER BY l.created_at DESC
  `).all(req.params.id);

  res.json({ ...order, items, shipping_records: shipping, logs });
});

// 创建订单
router.post('/', authRequired, (req, res) => {
  const { customer_id, order_no, order_date, remark, items } = req.body;
  if (!customer_id) return res.status(400).json({ error: '请选择客户' });
  if (!order_date) return res.status(400).json({ error: '请选择下单日期' });
  if (!items || items.length === 0) return res.status(400).json({ error: '请添加至少一条订单明细' });

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(400).json({ error: '客户不存在' });

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => {
    const subtotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + subtotal;
  }, 0);

  // 订单号：优先使用传入的自定义值，否则自动生成
  let orderNo = (order_no || '').trim();
  if (!orderNo) {
    orderNo = generateOrderNo(customer_id, order_date);
  } else {
    // 唯一性检查
    const dup = db.prepare('SELECT id FROM orders WHERE order_no = ?').get(orderNo);
    if (dup) return res.status(400).json({ error: '订单号已存在，请修改或留空自动生成' });
  }

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
  const { customer_id, order_no, order_date, remark, items } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  // 如果传了新的订单号，检查唯一性（允许与旧值相同）
  let newOrderNo = order.order_no;
  if (order_no !== undefined) {
    const trimmed = String(order_no).trim();
    if (trimmed) {
      const dup = db.prepare('SELECT id FROM orders WHERE order_no = ? AND id != ?').get(trimmed, id);
      if (dup) return res.status(400).json({ error: '订单号已存在' });
      newOrderNo = trimmed;
    }
  }

  const totalAmount = (items || []).reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0);
  }, 0);

  const updateOrder = db.prepare(`
    UPDATE orders SET order_no=?, customer_id=?, order_date=?, remark=?, total_amount=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `);
  const deleteItems = db.prepare('DELETE FROM order_items WHERE order_id = ?');
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_name, specification, unit, quantity, unit_price, subtotal, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare('INSERT INTO order_logs (order_id, user_id, action, detail) VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    updateOrder.run(newOrderNo, customer_id ?? order.customer_id, order_date ?? order.order_date, remark ?? order.remark, totalAmount, id);
    if (items) {
      deleteItems.run(id);
      items.forEach((item, idx) => {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        insertItem.run(id, item.product_name, item.specification || '', item.unit || '',
          item.quantity || 0, item.unit_price || 0, subtotal, idx);
      });
    }
    const changed = [];
    if (newOrderNo !== order.order_no) changed.push(`订单号 ${order.order_no} → ${newOrderNo}`);
    changed.push('基本信息/明细');
    insertLog.run(id, req.user.id, '编辑订单', changed.join('；'));
  });
  tx();
  res.json({ message: '订单更新成功', order_no: newOrderNo });
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

// 登记发货（一次可登记多个订单明细的发货数量）
router.post('/:id/ship', authRequired, (req, res) => {
  const order_id = req.params.id;
  const { items, shipped_date, remark } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '请至少登记一个明细的发货数量' });
  const date = shipped_date || new Date().toISOString().slice(0, 10);

  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const insertStmt = db.prepare(`
    INSERT INTO shipping_records (order_id, order_item_id, quantity, shipped_date, remark, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const logStmt = db.prepare(`
    INSERT INTO order_logs (order_id, user_id, action, detail)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const logs = [];
    for (const it of items) {
      const { order_item_id, quantity } = it;
      if (!order_item_id || !quantity || quantity <= 0) continue;
      const oi = db.prepare('SELECT id, quantity, product_name, unit FROM order_items WHERE id = ? AND order_id = ?').get(order_item_id, order_id);
      if (!oi) continue;
      const shipped = db.prepare('SELECT COALESCE(SUM(quantity),0) AS s FROM shipping_records WHERE order_item_id = ?').get(order_item_id).s;
      if (Number(shipped) + Number(quantity) > Number(oi.quantity) + 0.0001) {
        throw new Error('明细「' + (oi.product_name || '') + '」本次发货总数超过订单数量');
      }
      insertStmt.run(order_id, order_item_id, quantity, date, it.remark || remark || '', req.user.id);
      logs.push(`${oi.product_name || ''} 发货 ${quantity}${oi.unit || ''}`);
    }
    if (logs.length === 0) throw new Error('没有有效的发货记录');

    // 更新订单发货状态
    const allItems = db.prepare(`
      SELECT oi.id, oi.quantity,
             COALESCE((SELECT SUM(quantity) FROM shipping_records sr WHERE sr.order_item_id = oi.id), 0) AS shipped_qty
      FROM order_items oi WHERE oi.order_id = ?
    `).all(order_id);
    let newStatus = 'PENDING';
    if (allItems.length > 0) {
      const hasShipped = allItems.some(i => Number(i.shipped_qty) > 0);
      const allFull = allItems.every(i => Number(i.shipped_qty) + 0.0001 >= Number(i.quantity));
      if (allFull) newStatus = 'SHIPPED';
      else if (hasShipped) newStatus = 'PARTIAL_SHIPPED';
    }
    db.prepare("UPDATE orders SET delivery_status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newStatus, order_id);

    logStmt.run(order_id, req.user.id, '登记发货', logs.join('；'));
    return logs.length;
  });

  try {
    const count = tx();
    res.json({ message: `发货登记成功，共 ${count} 条明细` });
  } catch (e) {
    res.status(400).json({ error: e.message || '发货登记失败' });
  }
});

// 对账单：按客户+日期范围汇总（含付款记录，优先抵扣期初欠款）
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

  // 查询该客户所有付款记录（不限日期，用于抵扣期初欠款）
  const allPayments = db.prepare(`
    SELECT id, amount, payment_date, remark FROM payments WHERE customer_id = ? ORDER BY payment_date ASC, id ASC
  `).all(customerId);

  const rawInitialDebt = Number(customer.initial_debt) || 0;

  // 付款优先抵扣期初欠款：累计抵扣，超出部分算作本期已付（仅统计区间内的）
  let remainingInitial = rawInitialDebt;
  let paymentAppliedToPeriod = 0; // 区间内付款中用于抵扣本期订单的部分
  const paymentRecords = allPayments.map((p) => {
    const amount = Number(p.amount) || 0;
    let appliedToInitial = 0;
    let appliedToOrders = 0;
    if (remainingInitial > 0) {
      appliedToInitial = Math.min(amount, remainingInitial);
      remainingInitial -= appliedToInitial;
    }
    appliedToOrders = amount - appliedToInitial;
    // 区间内的付款才计入本期已付
    const inPeriod = (!startDate || p.payment_date >= startDate) && (!endDate || p.payment_date <= endDate);
    if (inPeriod) paymentAppliedToPeriod += appliedToOrders;
    return {
      id: p.id,
      amount,
      payment_date: p.payment_date,
      remark: p.remark || '',
      applied_to_initial: appliedToInitial,
      applied_to_orders: appliedToOrders,
      in_period: inPeriod,
    };
  });

  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);
  const orderPaid = orders.reduce((s, o) => s + o.paid_amount, 0);
  const totalPaid = orderPaid + paymentAppliedToPeriod;
  const balanceDue = remainingInitial + totalAmount - totalPaid;

  res.json({
    customer,
    orders,
    payments: paymentRecords,
    summary: {
      initial_debt: rawInitialDebt,        // 原始期初欠款
      initial_debt_remaining: remainingInitial, // 抵扣后剩余期初欠款
      total_amount: totalAmount,            // 本期订单总额
      order_paid: orderPaid,                // 订单已付（订单状态里的已付金额）
      payment_in_period: paymentAppliedToPeriod, // 本期付款中抵扣订单的部分
      total_paid: totalPaid,                // 本期已付合计 = 订单已付 + 付款抵扣订单
      balance_due: balanceDue,              // 本期应付
      order_count: orders.length,
    },
    dateRange: { startDate: startDate || '', endDate: endDate || '' },
  });
});

export default router;
