// 状态映射配置
export const DELIVERY_STATUS = {
  PENDING: { label: '待发货', color: '#f56c6c', bg: '#fef0f0', type: 'danger' },
  SHIPPED: { label: '已发货', color: '#e6a23c', bg: '#fdf6ec', type: 'warning' },
  RECEIVED: { label: '已签收', color: '#67c23a', bg: '#f0f9eb', type: 'success' },
};

export const PAYMENT_STATUS = {
  UNPAID: { label: '未付款', color: '#f56c6c', bg: '#fef0f0', type: 'danger' },
  PARTIAL: { label: '部分付款', color: '#e6a23c', bg: '#fdf6ec', type: 'warning' },
  PAID: { label: '已付款', color: '#67c23a', bg: '#f0f9eb', type: 'success' },
};

export const INVOICE_STATUS = {
  UNINVOICED: { label: '未开票', color: '#909399', bg: '#f4f4f5', type: 'info' },
  INVOICED: { label: '已开票', color: '#409eff', bg: '#ecf5ff', type: 'primary' },
};

export const DELIVERY_OPTIONS = [
  { value: 'PENDING', label: '待发货' },
  { value: 'SHIPPED', label: '已发货' },
  { value: 'RECEIVED', label: '已签收' },
];

export const PAYMENT_OPTIONS = [
  { value: 'UNPAID', label: '未付款' },
  { value: 'PARTIAL', label: '部分付款' },
  { value: 'PAID', label: '已付款' },
];

export const INVOICE_OPTIONS = [
  { value: 'UNINVOICED', label: '未开票' },
  { value: 'INVOICED', label: '已开票' },
];

export function getStatusLabel(type, value) {
  const map = { delivery: DELIVERY_STATUS, payment: PAYMENT_STATUS, invoice: INVOICE_STATUS };
  return map[type]?.[value]?.label || value;
}

export function getStatusType(type, value) {
  const map = { delivery: DELIVERY_STATUS, payment: PAYMENT_STATUS, invoice: INVOICE_STATUS };
  return map[type]?.[value]?.type || 'info';
}

// 金额格式化
export function formatMoney(num) {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
