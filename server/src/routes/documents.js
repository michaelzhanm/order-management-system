import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { toChineseAmount } from '../utils/orderNo.js';

const router = Router();

// 获取系统设置
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  return obj;
}

// 合同预览
router.get('/contract/:orderId', authRequired, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.company_name, c.contact_name, c.phone, c.address, c.tax_number
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?
  `).get(req.params.orderId);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort_order').all(req.params.orderId);
  const settings = getSettings();

  const html = renderContract(order, items, settings);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 发货单预览
router.get('/shipping/:orderId', authRequired, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.company_name, c.contact_name, c.phone, c.address
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?
  `).get(req.params.orderId);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort_order').all(req.params.orderId);
  const settings = getSettings();

  const html = renderShippingNote(order, items, settings);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 对账单预览
router.get('/statement/:customerId', authRequired, (req, res) => {
  const { startDate, endDate } = req.query;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.customerId);
  if (!customer) return res.status(404).json({ error: '客户不存在' });

  let where = 'WHERE customer_id = ?';
  const params = [req.params.customerId];
  if (startDate) { where += ' AND order_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND order_date <= ?'; params.push(endDate); }

  const orders = db.prepare(`SELECT * FROM orders ${where} ORDER BY order_date`).all(...params);
  const settings = getSettings();

  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid = orders.reduce((s, o) => s + o.paid_amount, 0);
  const initialDebt = customer.initial_debt || 0;
  const balanceDue = initialDebt + totalAmount - totalPaid;

  const html = renderStatement(customer, orders, { initialDebt, totalAmount, totalPaid, balanceDue }, settings, startDate, endDate);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ========== HTML 模板渲染 ==========

function docStyle(title) {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: "SimSun", "宋体", "Noto Serif SC", serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
      .doc-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: 4px; }
      .doc-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
      .info-row { margin-bottom: 8px; font-size: 14px; line-height: 1.8; }
      .info-row .label { display: inline-block; width: 80px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
      th, td { border: 1px solid #555; padding: 8px 10px; text-align: center; }
      th { background: #f0f0f0; font-weight: bold; }
      .amount-row { text-align: right; padding: 10px 0; font-size: 14px; }
      .amount-row .total { font-size: 18px; font-weight: bold; color: #c0392b; }
      .amount-cn { font-size: 14px; font-weight: bold; margin: 5px 0; }
      .section-title { font-weight: bold; font-size: 15px; margin: 20px 0 10px; }
      .terms { font-size: 13px; line-height: 2; }
      .sign-area { display: flex; justify-content: space-between; margin-top: 60px; font-size: 14px; }
      .sign-block { width: 45%; }
      .sign-block .line { border-bottom: 1px solid #999; height: 30px; margin: 5px 0; }
      .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
      @media print {
        body { padding: 20px; max-width: none; }
        .no-print { display: none; }
        @page { size: A4; margin: 1.5cm; }
      }
      .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 24px; background: #1677ff; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; z-index: 999; }
      .print-btn:hover { background: #0958d9; }
    </style>
  `;
}

function printButton() {
  return `<button class="print-btn no-print" onclick="window.print()">打印 / 保存PDF</button>`;
}

function renderContract(order, items, settings) {
  const itemsRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.specification || ''}</td>
      <td>${item.unit || ''}</td>
      <td>${item.quantity}</td>
      <td>${item.unit_price.toFixed(2)}</td>
      <td>${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>购销合同 - ${order.order_no}</title>${docStyle()}</head>
<body>
  ${printButton()}
  <div class="doc-title">购 销 合 同</div>

  <div class="doc-header">
    <span>合同编号：${order.order_no}</span>
    <span>签订日期：${order.order_date}</span>
  </div>

  <div class="info-row"><span class="label">甲方（买方）：</span>${order.company_name}</div>
  <div class="info-row"><span class="label">联系人：</span>${order.contact_name || ''}　<span class="label">电话：</span>${order.phone || ''}</div>
  <div class="info-row"><span class="label">地址：</span>${order.address || ''}　<span class="label">税号：</span>${order.tax_number || ''}</div>
  <div class="info-row"><span class="label">乙方（卖方）：</span>${settings.company_name || ''}</div>
  <div class="info-row"><span class="label">联系人：</span>${settings.company_contact || ''}　<span class="label">电话：</span>${settings.company_phone || ''}</div>
  <div class="info-row"><span class="label">地址：</span>${settings.company_address || ''}</div>

  <p style="font-size:13px;margin:15px 0;">甲乙双方本着平等互利、诚实信用的原则，经友好协商，就以下产品购销事宜达成如下协议：</p>

  <div class="section-title">一、产品明细</div>
  <table>
    <thead>
      <tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价(元)</th><th>小计(元)</th></tr>
    </thead>
    <tbody>${itemsRows}
      <tr><td colspan="6" style="text-align:right;font-weight:bold;">合计金额（小写）：</td><td style="font-weight:bold;color:#c0392b;">¥${order.total_amount.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="amount-cn">合计金额（大写）：${toChineseAmount(order.total_amount)}</div>

  <div class="section-title">二、付款方式</div>
  <div class="terms">
    1. 付款方式：${order.payment_status === 'PAID' ? '已付清' : order.payment_status === 'PARTIAL' ? `部分付款，已付 ¥${order.paid_amount.toFixed(2)}` : '尚未付款'}。<br>
    2. 甲方应在收到货物后按约定时间向乙方支付货款。<br>
    3. 乙方收款账户：${settings.company_bank || '________'}　账号：${settings.company_bank_account || '________'}
  </div>

  <div class="section-title">三、交货条款</div>
  <div class="terms">
    1. 交货日期：双方另行协商确定。<br>
    2. 交货方式：乙方负责将货物运输至甲方指定地点。<br>
    3. 运输费用由乙方承担。
  </div>

  <div class="section-title">四、其他约定</div>
  <div class="terms">
    1. 本合同一式两份，甲乙双方各执一份，具有同等法律效力。<br>
    2. 本合同自双方签字盖章之日起生效。<br>
    ${order.remark ? `3. 备注：${order.remark}` : ''}
  </div>

  <div class="sign-area">
    <div class="sign-block">
      <div>甲方（盖章）：${order.company_name}</div>
      <div class="line"></div>
      <div>授权代表签字：</div>
      <div class="line"></div>
      <div>日期：${order.order_date}</div>
    </div>
    <div class="sign-block">
      <div>乙方（盖章）：${settings.company_name || ''}</div>
      <div class="line"></div>
      <div>授权代表签字：</div>
      <div class="line"></div>
      <div>日期：${order.order_date}</div>
    </div>
  </div>
  <div class="footer">本合同由企业订单管理系统自动生成</div>
</body></html>`;
}

function renderShippingNote(order, items, settings) {
  const itemsRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td>${item.specification || ''}</td>
      <td>${item.unit || ''}</td>
      <td>${item.quantity}</td>
      <td>${item.remark || ''}</td>
    </tr>
  `).join('');

  const today = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>发货单 - ${order.order_no}</title>${docStyle()}</head>
<body>
  ${printButton()}
  <div class="doc-title">发 货 单</div>

  <div class="doc-header">
    <span>发货单号：${order.order_no}-FH</span>
    <span>发货日期：${today}</span>
  </div>

  <div class="info-row"><span class="label">订单编号：</span>${order.order_no}</div>
  <div class="info-row"><span class="label">收货单位：</span>${order.company_name}</div>
  <div class="info-row"><span class="label">联系人：</span>${order.contact_name || ''}　<span class="label">电话：</span>${order.phone || ''}</div>
  <div class="info-row"><span class="label">收货地址：</span>${order.address || ''}</div>
  <div class="info-row"><span class="label">发货单位：</span>${settings.company_name || ''}　<span class="label">电话：</span>${settings.company_phone || ''}</div>

  <div class="section-title">发货明细</div>
  <table>
    <thead>
      <tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>备注</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="info-row" style="margin-top:15px;"><span class="label">合计数量：</span>${items.reduce((s, i) => s + i.quantity, 0)} ${items[0]?.unit || ''}</div>
  <div class="info-row"><span class="label">备注：</span>${order.remark || ''}</div>

  <div class="sign-area">
    <div class="sign-block">
      <div>发货人签字：</div>
      <div class="line"></div>
      <div>发货日期：${today}</div>
    </div>
    <div class="sign-block">
      <div>收货人签字：</div>
      <div class="line"></div>
      <div>收货日期：　　　　年　　月　　日</div>
    </div>
  </div>
  <div class="footer">本发货单由企业订单管理系统自动生成</div>
</body></html>`;
}

function renderStatement(customer, orders, summary, settings, startDate, endDate) {
  const itemsRows = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.order_no}</td>
      <td>${o.order_date}</td>
      <td style="text-align:right;">¥${o.total_amount.toFixed(2)}</td>
      <td style="text-align:right;">¥${o.paid_amount.toFixed(2)}</td>
      <td style="text-align:right;">¥${(o.total_amount - o.paid_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const today = new Date().toISOString().slice(0, 10);
  const period = startDate && endDate ? `${startDate} 至 ${endDate}` : '全部';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>对账单 - ${customer.company_name}</title>${docStyle()}</head>
<body>
  ${printButton()}
  <div class="doc-title">对 账 单</div>

  <div class="doc-header">
    <span>客户：${customer.company_name}</span>
    <span>对账日期：${today}</span>
  </div>

  <div class="info-row"><span class="label">客户名称：</span>${customer.company_name}</div>
  <div class="info-row"><span class="label">联系人：</span>${customer.contact_name || ''}　<span class="label">电话：</span>${customer.phone || ''}</div>
  <div class="info-row"><span class="label">对账周期：</span>${period}</div>

  <div class="section-title">订单明细汇总</div>
  <table>
    <thead>
      <tr><th>序号</th><th>订单编号</th><th>下单日期</th><th>订单金额</th><th>已付金额</th><th>未付金额</th></tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="6" style="text-align:center;">该时间段内无订单记录</td></tr>'}
    </tbody>
  </table>

  <div style="margin-top:20px;font-size:14px;line-height:2.5;">
    <div class="amount-row">期初欠款（上期结余）：¥${summary.initialDebt.toFixed(2)}</div>
    <div class="amount-row">本期订单总金额：¥${summary.totalAmount.toFixed(2)}</div>
    <div class="amount-row">本期已付金额：¥${summary.totalPaid.toFixed(2)}</div>
    <div class="amount-row"><span class="total">本期应付金额：¥${summary.balanceDue.toFixed(2)}</span></div>
    <div class="amount-cn">大写：${toChineseAmount(summary.balanceDue)}</div>
  </div>

  <p style="font-size:13px;margin-top:20px;line-height:2;">
    本期应付 = 期初欠款 + 本期订单总金额 - 本期已付金额<br>
    请核对以上账目，如有异议请在收到本对账单后7个工作日内联系我方。
  </p>

  <div class="sign-area">
    <div class="sign-block">
      <div>制表单位（盖章）：${settings.company_name || ''}</div>
      <div class="line"></div>
      <div>制表日期：${today}</div>
    </div>
    <div class="sign-block">
      <div>客户确认（盖章）：${customer.company_name}</div>
      <div class="line"></div>
      <div>确认日期：　　　　年　　月　　日</div>
    </div>
  </div>
  <div class="footer">本对账单由企业订单管理系统自动生成</div>
</body></html>`;
}

export default router;
