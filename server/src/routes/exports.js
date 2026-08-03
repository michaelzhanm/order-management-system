import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

const router = Router();

const DELIVERY_MAP = { PENDING: '待发货', SHIPPED: '已发货', RECEIVED: '已签收' };
const PAYMENT_MAP = { UNPAID: '未付款', PARTIAL: '部分付款', PAID: '已付款' };
const INVOICE_MAP = { UNINVOICED: '未开票', INVOICED: '已开票' };

// 计算对账数据（与 orders.js 的 statement 逻辑一致，供导出复用）
function buildStatement(customerId, startDate, endDate) {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) return null;

  let where = 'WHERE customer_id = ?';
  const params = [customerId];
  if (startDate) { where += ' AND order_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND order_date <= ?'; params.push(endDate); }

  const orders = db.prepare(`
    SELECT id, order_no, order_date, total_amount, paid_amount,
           delivery_status, payment_status, invoice_status
    FROM orders ${where} ORDER BY order_date
  `).all(...params);

  const allPayments = db.prepare(`
    SELECT id, amount, payment_date, remark FROM payments WHERE customer_id = ? ORDER BY payment_date ASC, id ASC
  `).all(customerId);

  const rawInitialDebt = Number(customer.initial_debt) || 0;
  let remainingInitial = rawInitialDebt;
  let paymentAppliedToPeriod = 0;
  const paymentRecords = allPayments.map((p) => {
    const amount = Number(p.amount) || 0;
    let appliedToInitial = 0;
    if (remainingInitial > 0) {
      appliedToInitial = Math.min(amount, remainingInitial);
      remainingInitial -= appliedToInitial;
    }
    const appliedToOrders = amount - appliedToInitial;
    const inPeriod = (!startDate || p.payment_date >= startDate) && (!endDate || p.payment_date <= endDate);
    if (inPeriod) paymentAppliedToPeriod += appliedToOrders;
    return { ...p, amount, applied_to_initial: appliedToInitial, applied_to_orders: appliedToOrders, in_period: inPeriod };
  });

  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);
  const orderPaid = orders.reduce((s, o) => s + o.paid_amount, 0);
  const totalPaid = orderPaid + paymentAppliedToPeriod;
  const balanceDue = remainingInitial + totalAmount - totalPaid;

  return {
    customer,
    orders,
    payments: paymentRecords,
    summary: {
      initial_debt: rawInitialDebt,
      initial_debt_remaining: remainingInitial,
      total_amount: totalAmount,
      order_paid: orderPaid,
      payment_in_period: paymentAppliedToPeriod,
      total_paid: totalPaid,
      balance_due: balanceDue,
      order_count: orders.length,
    },
  };
}

// 导出对账单 xlsx：支持 order_ids 过滤（为空则导出全部查询结果）
router.post('/statement', authRequired, async (req, res) => {
  const { customer_id, startDate, endDate, order_ids } = req.body;
  if (!customer_id) return res.status(400).json({ error: '缺少客户ID' });

  const data = buildStatement(customer_id, startDate, endDate);
  if (!data) return res.status(404).json({ error: '客户不存在' });

  // 过滤选中订单（未传 order_ids 则导出全部）
  let orders = data.orders;
  if (Array.isArray(order_ids) && order_ids.length > 0) {
    const idSet = new Set(order_ids.map(Number));
    orders = orders.filter((o) => idSet.has(o.id));
  }

  const wb = new ExcelJS.Workbook();
  const sheetName = (data.customer.company_name || '客户').slice(0, 28);
  const ws = wb.addWorksheet(sheetName);

  // 样式
  const titleFont = { name: '宋体', size: 16, bold: true };
  const headerFont = { name: '宋体', size: 11, bold: true };
  const cellFont = { name: '宋体', size: 11 };
  const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const rightAlign = { vertical: 'middle', horizontal: 'right' };
  const leftAlign = { vertical: 'middle', horizontal: 'left' };
  const thinBorder = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };

  // 标题
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = '对 账 单';
  ws.getCell('A1').font = titleFont;
  ws.getCell('A1').alignment = centerAlign;
  ws.getRow(1).height = 30;

  // 客户信息
  const period = (startDate && endDate) ? `${startDate} 至 ${endDate}` : '全部';
  const infoRows = [
    ['客户名称', data.customer.company_name || '', '联系人', data.customer.contact_name || '', '电话', data.customer.phone || ''],
    ['地址', data.customer.address || '', '税号', data.customer.tax_number || '', '对账区间', period],
  ];
  infoRows.forEach((row) => {
    const r = ws.addRow(row);
    r.eachCell((cell) => {
      cell.font = cellFont;
      cell.alignment = leftAlign;
    });
  });

  ws.addRow([]);

  // 订单明细表头
  const headers = ['序号', '订单编号', '下单日期', '订单金额', '已付金额', '未付金额', '发货状态', '付款状态'];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = headerFont;
    cell.alignment = centerAlign;
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });

  // 订单明细
  let sumAmount = 0, sumPaid = 0;
  orders.forEach((o, i) => {
    const unpaid = Number(o.total_amount) - Number(o.paid_amount);
    sumAmount += o.total_amount;
    sumPaid += o.paid_amount;
    const row = ws.addRow([
      i + 1, o.order_no, o.order_date,
      Number(o.total_amount), Number(o.paid_amount), unpaid,
      DELIVERY_MAP[o.delivery_status] || o.delivery_status,
      PAYMENT_MAP[o.payment_status] || o.payment_status,
    ]);
    row.eachCell((cell, colNumber) => {
      cell.font = cellFont;
      cell.border = thinBorder;
      if (colNumber === 1) cell.alignment = centerAlign;
      else if (colNumber === 2) cell.alignment = leftAlign;
      else if (colNumber === 3) cell.alignment = centerAlign;
      else cell.alignment = rightAlign;
      if (colNumber >= 4 && colNumber <= 6) {
        cell.numFmt = '¥#,##0.00';
      }
    });
  });

  // 合计行
  const totalRow = ws.addRow(['', '', '合计', sumAmount, sumPaid, sumAmount - sumPaid, '', '']);
  totalRow.eachCell((cell, colNumber) => {
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = colNumber >= 4 && colNumber <= 6 ? rightAlign : centerAlign;
    if (colNumber >= 4 && colNumber <= 6) cell.numFmt = '¥#,##0.00';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
  });

  ws.addRow([]);

  // 付款记录
  ws.addRow(['付款记录']).font = headerFont;
  const payHeader = ws.addRow(['序号', '付款日期', '付款金额', '抵扣期初', '抵扣订单', '是否本期', '备注']);
  payHeader.height = 22;
  payHeader.eachCell((cell) => {
    cell.font = headerFont;
    cell.alignment = centerAlign;
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });
  data.payments.forEach((p, i) => {
    const row = ws.addRow([
      i + 1, p.payment_date, p.amount,
      p.applied_to_initial, p.applied_to_orders,
      p.in_period ? '是' : '否', p.remark || '',
    ]);
    row.eachCell((cell, colNumber) => {
      cell.font = cellFont;
      cell.border = thinBorder;
      if (colNumber === 1 || colNumber === 6) cell.alignment = centerAlign;
      else if (colNumber === 7) cell.alignment = leftAlign;
      else cell.alignment = rightAlign;
      if (colNumber >= 3 && colNumber <= 5) cell.numFmt = '¥#,##0.00';
    });
  });

  ws.addRow([]);

  // 汇总
  const s = data.summary;
  const summaryRows = [
    ['期初欠款（原始）', s.initial_debt],
    ['期初欠款（抵扣后剩余）', s.initial_debt_remaining],
    ['本期订单总额', s.total_amount],
    ['订单已付金额', s.order_paid],
    ['本期付款抵扣订单', s.payment_in_period],
    ['本期已付合计', s.total_paid],
    ['本期应付', s.balance_due],
  ];
  summaryRows.forEach((row, idx) => {
    const r = ws.addRow([row[0], row[1]]);
    r.getCell(1).font = cellFont;
    r.getCell(2).font = { name: '宋体', size: 11, bold: idx === summaryRows.length - 1 };
    r.getCell(1).alignment = rightAlign;
    r.getCell(2).alignment = rightAlign;
    r.getCell(2).numFmt = '¥#,##0.00';
    if (idx === summaryRows.length - 1) {
      r.getCell(2).font = { name: '宋体', size: 12, bold: true, color: { argb: 'FFC0392B' } };
    }
  });

  // 列宽
  ws.columns.forEach((col, i) => {
    const widths = [6, 22, 14, 14, 14, 14, 12, 12];
    col.width = widths[i] || 12;
  });

  // 输出
  const fileName = encodeURIComponent(`对账单_${data.customer.company_name || '客户'}_${startDate || '全部'}_${endDate || ''}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);

  const buffer = await wb.xlsx.writeBuffer();
  res.end(Buffer.from(buffer));
});

export default router;
