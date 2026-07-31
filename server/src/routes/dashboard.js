import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authRequired, (req, res) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthOrders = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total
    FROM orders WHERE order_date LIKE ?
  `).get(`${yearMonth}%`);

  const pendingShipment = db.prepare(`
    SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'PENDING'
  `).get();

  const unpaidAmount = db.prepare(`
    SELECT COALESCE(SUM(total_amount - paid_amount),0) as amount FROM orders
    WHERE payment_status IN ('UNPAID','PARTIAL')
  `).get();

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();

  const recentOrders = db.prepare(`
    SELECT o.id, o.order_no, o.order_date, o.total_amount,
           o.delivery_status, o.payment_status, o.invoice_status,
           c.company_name
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();

  // 本月每日订单趋势
  const dailyStats = db.prepare(`
    SELECT order_date, COUNT(*) as count, SUM(total_amount) as amount
    FROM orders WHERE order_date LIKE ?
    GROUP BY order_date ORDER BY order_date
  `).all(`${yearMonth}%`);

  res.json({
    monthOrderCount: monthOrders.count,
    monthOrderTotal: monthOrders.total,
    pendingShipmentCount: pendingShipment.count,
    unpaidAmount: unpaidAmount.amount,
    customerCount: customerCount.count,
    recentOrders,
    dailyStats,
  });
});

export default router;
