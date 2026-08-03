import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// 根据订单ID查询所有发货记录（按订单明细分组展示用）
router.get('/', authRequired, (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ error: '缺少订单ID' });

  const list = db.prepare(`
    SELECT sr.*,
           oi.product_name, oi.specification, oi.unit, oi.quantity as total_quantity,
           u.real_name as creator_name
    FROM shipping_records sr
    LEFT JOIN order_items oi ON sr.order_item_id = oi.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.order_id = ?
    ORDER BY sr.shipped_date DESC, sr.created_at DESC
  `).all(order_id);
  res.json({ list });
});

// 登记发货（一次可登记多个订单明细的发货数量）
router.post('/', authRequired, (req, res) => {
  const { order_id, items, shipped_date, remark } = req.body;
  if (!order_id) return res.status(400).json({ error: '缺少订单ID' });
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
      const oi = db.prepare('SELECT id, quantity FROM order_items WHERE id = ? AND order_id = ?').get(order_item_id, order_id);
      if (!oi) continue;
      // 校验总发货量不超过订单数量（按明细累计）
      const shipped = db.prepare('SELECT COALESCE(SUM(quantity),0) AS s FROM shipping_records WHERE order_item_id = ?').get(order_item_id).s;
      if (Number(shipped) + Number(quantity) > Number(oi.quantity) + 0.0001) {
        // 不严格禁止，但提示？这里直接返回错误更稳妥
        throw new Error('明细「' + (oi.product_name || '') + '」发货总数超过订单数量');
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
    db.prepare('UPDATE orders SET delivery_status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newStatus, order_id);

    logStmt.run(order_id, req.user.id, '登记发货', logs.join('；'));
  });

  try {
    tx();
    res.json({ message: '发货登记成功' });
  } catch (e) {
    res.status(400).json({ error: e.message || '发货登记失败' });
  }
});

// 删除某条发货记录（写错了可以撤回）
router.delete('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const sr = db.prepare('SELECT * FROM shipping_records WHERE id = ?').get(id);
  if (!sr) return res.status(404).json({ error: '发货记录不存在' });
  const orderId = sr.order_id;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM shipping_records WHERE id = ?').run(id);
    db.prepare(`
      INSERT INTO order_logs (order_id, user_id, action, detail)
      VALUES (?, ?, '撤销发货', ?)
    `).run(orderId, req.user.id, `删除发货记录 ${sr.quantity}`);

    // 重新计算订单发货状态
    const allItems = db.prepare(`
      SELECT oi.id, oi.quantity,
             COALESCE((SELECT SUM(quantity) FROM shipping_records sr WHERE sr.order_item_id = oi.id), 0) AS shipped_qty
      FROM order_items oi WHERE oi.order_id = ?
    `).all(orderId);
    let newStatus = 'PENDING';
    if (allItems.length > 0) {
      const hasShipped = allItems.some(i => Number(i.shipped_qty) > 0);
      const allFull = allItems.every(i => Number(i.shipped_qty) + 0.0001 >= Number(i.quantity));
      if (allFull) newStatus = 'SHIPPED';
      else if (hasShipped) newStatus = 'PARTIAL_SHIPPED';
    }
    db.prepare('UPDATE orders SET delivery_status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newStatus, orderId);
  });
  try {
    tx();
    res.json({ message: '发货记录已删除' });
  } catch (e) {
    res.status(400).json({ error: e.message || '操作失败' });
  }
});

export default router;
