import { pinyin } from 'pinyin-pro';
import db from '../db.js';

/**
 * 获取中文的首字母大写
 * 例: "北京制造" -> "BJZZ"
 */
function getInitials(name) {
  if (!name) return 'XX';
  const result = pinyin(name, { pattern: 'first', type: 'array' });
  const letters = result
    .filter(c => /[a-z]/i.test(c))
    .join('')
    .toUpperCase();
  return letters || 'XX';
}

/**
 * 生成订单编号: [乙方前缀]-[甲方前缀]-YYYYMMDD-序号
 * 优先使用 customer.order_prefix (甲方) 和 settings.company_order_prefix (乙方)，
 * 若未设置则退回到公司名称拼音首字母。
 */
export function generateOrderNo(customerId, orderDate) {
  const customer = db.prepare('SELECT company_name, order_prefix FROM customers WHERE id = ?').get(customerId);
  if (!customer) throw new Error('客户不存在');

  const companySetting = db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get();
  const companyName = companySetting?.value || '我公司';
  const prefixSetting = db.prepare("SELECT value FROM settings WHERE key = 'company_order_prefix'").get();
  const companyOrderPrefix = prefixSetting?.value || '';

  const partyB = companyOrderPrefix || getInitials(companyName);
  const partyA = customer.order_prefix || getInitials(customer.company_name);

  let dateStr = orderDate;
  if (!dateStr) {
    const today = new Date();
    dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
  } else {
    dateStr = dateStr.replace(/-/g, '');
  }

  const prefix = `${partyB}-${partyA}-${dateStr}`;

  const existing = db
    .prepare('SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no')
    .all(`${prefix}%`);

  let seq = 1;
  if (existing.length > 0) {
    const maxSeq = existing.reduce((max, row) => {
      const parts = row.order_no.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    seq = maxSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

/**
 * 数字转中文大写金额
 */
export function toChineseAmount(num) {
  if (num === 0) return '零元整';
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];

  const numStr = num.toFixed(2);
  const [intPart, decPart] = numStr.split('.');
  const intNum = parseInt(intPart, 10);

  let result = '';

  // 整数部分
  if (intNum === 0) {
    result = '零';
  } else {
    const intStr = intNum.toString();
    const len = intStr.length;
    let zeroFlag = false;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(intStr[i], 10);
      const pos = len - 1 - i;
      const unitIdx = pos % 4;
      const bigUnitIdx = Math.floor(pos / 4);

      if (digit === 0) {
        zeroFlag = true;
      } else {
        if (zeroFlag) {
          result += '零';
          zeroFlag = false;
        }
        result += digits[digit] + units[unitIdx];
      }
      if (unitIdx === 0 && (digit !== 0 || bigUnitIdx > 0)) {
        if (bigUnits[bigUnitIdx]) {
          result += bigUnits[bigUnitIdx];
        }
      }
    }
  }
  result += '元';

  // 小数部分
  if (decPart === '00') {
    result += '整';
  } else {
    const jiao = parseInt(decPart[0], 10);
    const fen = parseInt(decPart[1], 10);
    if (jiao > 0) result += digits[jiao] + '角';
    if (fen > 0) result += digits[fen] + '分';
  }

  return result;
}
