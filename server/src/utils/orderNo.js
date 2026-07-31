import { pinyin } from 'pinyin-pro';
import db from '../db.js';

/**
 * 获取中文的首字母大写
 * 例: "北京制造" -> "BJZZ"
 */
function getInitials(name) {
  if (!name) return 'XX';
  // 取拼音首字母
  const result = pinyin(name, { pattern: 'first', type: 'array' });
  const letters = result
    .filter(c => /[a-z]/i.test(c))
    .join('')
    .toUpperCase();
  return letters || 'XX';
}

/**
 * 生成订单编号: [乙方首字母]-[甲方首字母]-YYYYMMDD-序号
 * 乙方 = 系统配置的公司名, 甲方 = 客户公司名
 */
export function generateOrderNo(customerName, companyName) {
  const partyB = getInitials(companyName); // 乙方
  const partyA = getInitials(customerName); // 甲方
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `${partyB}-${partyA}-${dateStr}`;

  // 查找当天同前缀的订单数，生成序号
  const existing = db
    .prepare('SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no')
    .all(`${prefix}%`);

  let seq = 1;
  if (existing.length > 0) {
    // 取最大序号
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
