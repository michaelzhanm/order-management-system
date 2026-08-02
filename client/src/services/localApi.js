/**
 * 纯前端本地数据服务层
 * 使用 IndexedDB 存储所有数据，替代后端 API
 */
import { pinyin } from 'pinyin-pro';

// ============ IndexedDB 封装 ============

const DB_NAME = 'order_management_db';
const DB_VERSION = 1;

const STORES = ['users', 'customers', 'orders', 'order_items', 'settings', 'order_logs'];

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // 创建所有 store
      STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          if (name === 'settings') {
            db.createObjectStore(name, { keyPath: 'key' });
          } else {
            db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          }
        }
      });
    };
    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetByKey(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPutByKey(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbClear(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============ 初始化默认数据 ============

async function initDefaultData() {
  const users = await dbGetAll('users');
  if (users.length === 0) {
    await dbAdd('users', {
      id: 1,
      username: 'admin',
      password: 'admin123',
      role: 'ADMIN',
      real_name: '系统管理员',
      phone: '',
      must_change_password: false,
      created_at: new Date().toLocaleString('zh-CN'),
    });
  }

  const settings = await dbGetAll('settings');
  if (settings.length === 0) {
    const defaults = {
      company_name: '我公司',
      company_contact: '',
      company_phone: '',
      company_address: '',
      company_tax_number: '',
      company_bank: '',
      company_bank_account: '',
    };
    for (const [k, v] of Object.entries(defaults)) {
      await dbPutByKey('settings', { key: k, value: v });
    }
  }
}

// ============ 工具函数 ============

function getInitials(name) {
  if (!name) return 'XX';
  const result = pinyin(name, { pattern: 'first', type: 'array' });
  const letters = result.filter(c => /[a-z]/i.test(c)).join('').toUpperCase();
  return letters || 'XX';
}

function generateOrderNo(customerName, companyName, existingOrders) {
  const partyB = getInitials(companyName);
  const partyA = getInitials(customerName);
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const prefix = `${partyB}-${partyA}-${dateStr}`;

  const matching = existingOrders.filter(o => o.order_no && o.order_no.startsWith(prefix));
  let seq = 1;
  if (matching.length > 0) {
    const maxSeq = matching.reduce((max, row) => {
      const parts = row.order_no.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    seq = maxSeq + 1;
  }
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

function toChineseAmount(num) {
  if (num === 0) return '零元整';
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];
  const numStr = Math.abs(num).toFixed(2);
  const [intPart, decPart] = numStr.split('.');
  const intNum = parseInt(intPart, 10);
  let result = '';
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
        if (zeroFlag) { result += '零'; zeroFlag = false; }
        result += digits[digit] + units[unitIdx];
      }
      if (unitIdx === 0 && (digit !== 0 || bigUnitIdx > 0)) {
        if (bigUnits[bigUnitIdx]) result += bigUnits[bigUnitIdx];
      }
    }
  }
  result += '元';
  if (decPart === '00') {
    result += '整';
  } else {
    const jiao = parseInt(decPart[0], 10);
    const fen = parseInt(decPart[1], 10);
    if (jiao > 0) result += digits[jiao] + '角';
    if (fen > 0) result += digits[fen] + '分';
  }
  return num < 0 ? '负' + result : result;
}

async function getSettingsObj() {
  const rows = await dbGetAll('settings');
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  return obj;
}

// ============ API 方法 ============

const api = {
  // --- 认证 ---
  async post(url, body) {
    return this._route('POST', url, body);
  },
  async get(url, params) {
    return this._route('GET', url, null, params);
  },
  async put(url, body) {
    return this._route('PUT', url, body);
  },
  async patch(url, body) {
    return this._route('PATCH', url, body);
  },
  async delete(url) {
    return this._route('DELETE', url);
  },

  async _route(method, url, body, params) {
    await initDefaultData();
    const path = url.replace(/^\/api/, '').replace(/^\//, '');
    const parts = path.split('/');

    // 认证路由
    if (parts[0] === 'auth') {
      if (parts[1] === 'login' && method === 'POST') return this._login(body);
      if (parts[1] === 'me' && method === 'GET') return this._me();
      if (parts[1] === 'password' && method === 'PUT') return this._changePassword(body);
    }
    // 用户路由
    if (parts[0] === 'users') {
      if (method === 'GET') return this._getUsers();
      if (method === 'POST') return this._createUser(body);
      if (method === 'PUT' && parts[1]) return this._updateUser(parseInt(parts[1]), body);
      if (method === 'DELETE' && parts[1]) return this._deleteUser(parseInt(parts[1]));
    }
    // 客户路由
    if (parts[0] === 'customers') {
      if (method === 'GET' && !parts[1]) return this._getCustomers(params);
      if (method === 'GET' && parts[1]) return this._getCustomer(parseInt(parts[1]));
      if (method === 'POST') return this._createCustomer(body);
      if (method === 'PUT' && parts[1]) return this._updateCustomer(parseInt(parts[1]), body);
      if (method === 'DELETE' && parts[1]) return this._deleteCustomer(parseInt(parts[1]));
    }
    // 订单路由
    if (parts[0] === 'orders') {
      if (method === 'GET' && !parts[1]) return this._getOrders(params);
      if (method === 'GET' && parts[1] === 'statement' && parts[2]) return this._getStatement(parseInt(parts[2]), params);
      if (method === 'GET' && parts[1]) return this._getOrder(parseInt(parts[1]));
      if (method === 'POST') return this._createOrder(body);
      if (method === 'PUT' && parts[1]) return this._updateOrder(parseInt(parts[1]), body);
      if (method === 'PATCH' && parts[1] && parts[2] === 'status') return this._updateStatus(parseInt(parts[1]), body);
      if (method === 'DELETE' && parts[1]) return this._deleteOrder(parseInt(parts[1]));
    }
    // Dashboard
    if (parts[0] === 'dashboard' && parts[1] === 'stats') return this._getStats();
    // 系统设置
    if (parts[0] === 'settings') {
      if (method === 'GET') return getSettingsObj();
      if (method === 'PUT') return this._updateSettings(body);
    }
    // 文档路由
    if (parts[0] === 'documents') {
      if (parts[1] === 'contract' && parts[2]) return this._renderContract(parseInt(parts[2]));
      if (parts[1] === 'shipping' && parts[2]) return this._renderShipping(parseInt(parts[2]));
      if (parts[1] === 'statement' && parts[2]) return this._renderStatement(parseInt(parts[2]), params);
    }
    throw { response: { status: 404, data: { error: '接口不存在: ' + url } } };
  },

  // --- 认证实现 ---
  async _login({ username, password }) {
    if (!username || !password) throw { response: { status: 400, data: { error: '请输入用户名和密码' } } };
    const users = await dbGetAll('users');
    const user = users.find(u => u.username === username);
    if (!user || user.password !== password) {
      throw { response: { status: 401, data: { error: '用户名或密码错误' } } };
    }
    return {
      token: 'local-token-' + user.id,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        real_name: user.real_name,
        must_change_password: !!user.must_change_password,
      },
    };
  },

  async _me() {
    const userData = localStorage.getItem('user');
    if (!userData) throw { response: { status: 401, data: { error: '未登录' } } };
    const u = JSON.parse(userData);
    const users = await dbGetAll('users');
    const user = users.find(x => x.id === u.id);
    if (!user) throw { response: { status: 404, data: { error: '用户不存在' } } };
    return {
      id: user.id, username: user.username, role: user.role,
      real_name: user.real_name, phone: user.phone, created_at: user.created_at,
    };
  },

  async _changePassword({ oldPassword, newPassword }) {
    const userData = localStorage.getItem('user');
    const u = JSON.parse(userData);
    const users = await dbGetAll('users');
    const user = users.find(x => x.id === u.id);
    if (!user || user.password !== oldPassword) {
      throw { response: { status: 400, data: { error: '旧密码错误' } } };
    }
    user.password = newPassword;
    user.must_change_password = false;
    await dbPut('users', user);
    return { message: '密码修改成功' };
  },

  // --- 用户管理 ---
  async _getUsers() {
    const users = await dbGetAll('users');
    return users.map(u => ({
      id: u.id, username: u.username, role: u.role, real_name: u.real_name,
      phone: u.phone, must_change_password: !!u.must_change_password, created_at: u.created_at,
    }));
  },

  async _createUser({ username, password, role, real_name, phone }) {
    if (!username || !password) throw { response: { status: 400, data: { error: '用户名和密码不能为空' } } };
    const users = await dbGetAll('users');
    if (users.find(u => u.username === username)) {
      throw { response: { status: 400, data: { error: '用户名已存在' } } };
    }
    const id = await dbAdd('users', {
      username, password, role: role || 'EMPLOYEE',
      real_name: real_name || '', phone: phone || '',
      must_change_password: false, created_at: new Date().toLocaleString('zh-CN'),
    });
    return { id, message: '用户创建成功' };
  },

  async _updateUser(id, { role, real_name, phone, password }) {
    const user = await dbGet('users', id);
    if (!user) throw { response: { status: 404, data: { error: '用户不存在' } } };
    if (password) user.password = password;
    user.role = role || user.role;
    user.real_name = real_name ?? user.real_name;
    user.phone = phone ?? user.phone;
    await dbPut('users', user);
    return { message: '用户更新成功' };
  },

  async _deleteUser(id) {
    const userData = localStorage.getItem('user');
    const u = JSON.parse(userData);
    if (id === u.id) throw { response: { status: 400, data: { error: '不能删除当前登录用户' } } };
    const user = await dbGet('users', id);
    if (!user) throw { response: { status: 404, data: { error: '用户不存在' } } };
    const users = await dbGetAll('users');
    if (user.role === 'ADMIN' && users.filter(x => x.role === 'ADMIN').length <= 1) {
      throw { response: { status: 400, data: { error: '不能删除最后一个管理员' } } };
    }
    await dbDelete('users', id);
    return { message: '用户删除成功' };
  },

  // --- 客户管理 ---
  async _getCustomers(params = {}) {
    const { search, page = 1, pageSize = 50 } = params;
    let list = await dbGetAll('customers');
    if (search) {
      const kw = search.toLowerCase();
      list = list.filter(c =>
        (c.company_name || '').toLowerCase().includes(kw) ||
        (c.contact_name || '').toLowerCase().includes(kw) ||
        (c.phone || '').toLowerCase().includes(kw)
      );
    }
    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const total = list.length;
    const start = (parseInt(page) - 1) * parseInt(pageSize);
    const paged = list.slice(start, start + parseInt(pageSize));
    return { list: paged, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  },

  async _getCustomer(id) {
    const c = await dbGet('customers', id);
    if (!c) throw { response: { status: 404, data: { error: '客户不存在' } } };
    return c;
  },

  async _createCustomer({ company_name, contact_name, phone, address, tax_number, initial_debt }) {
    if (!company_name) throw { response: { status: 400, data: { error: '公司名称不能为空' } } };
    const all = await dbGetAll('customers');
    if (all.find(c => c.company_name === company_name)) {
      throw { response: { status: 400, data: { error: '公司名称已存在' } } };
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const id = await dbAdd('customers', {
      company_name, contact_name: contact_name || '', phone: phone || '',
      address: address || '', tax_number: tax_number || '',
      initial_debt: initial_debt || 0, created_by: userData.id || 1,
      created_at: new Date().toLocaleString('zh-CN'),
      updated_at: new Date().toLocaleString('zh-CN'),
    });
    return { id, message: '客户创建成功' };
  },

  async _updateCustomer(id, body) {
    const c = await dbGet('customers', id);
    if (!c) throw { response: { status: 404, data: { error: '客户不存在' } } };
    if (body.company_name && body.company_name !== c.company_name) {
      const all = await dbGetAll('customers');
      if (all.find(x => x.company_name === body.company_name && x.id !== id)) {
        throw { response: { status: 400, data: { error: '公司名称已存在' } } };
      }
    }
    Object.assign(c, {
      company_name: body.company_name ?? c.company_name,
      contact_name: body.contact_name ?? c.contact_name,
      phone: body.phone ?? c.phone,
      address: body.address ?? c.address,
      tax_number: body.tax_number ?? c.tax_number,
      initial_debt: body.initial_debt ?? c.initial_debt,
      updated_at: new Date().toLocaleString('zh-CN'),
    });
    await dbPut('customers', c);
    return { message: '客户更新成功' };
  },

  async _deleteCustomer(id) {
    const orders = await dbGetAll('orders');
    const count = orders.filter(o => o.customer_id === id).length;
    if (count > 0) {
      throw { response: { status: 400, data: { error: `该客户关联了 ${count} 个订单，无法删除` } } };
    }
    await dbDelete('customers', id);
    return { message: '客户删除成功' };
  },

  // --- 订单管理 ---
  async _getOrders(params = {}) {
    const {
      search, startDate, endDate,
      delivery_status, payment_status, invoice_status,
      customer_id, page = 1, pageSize = 20,
    } = params;

    let orders = await dbGetAll('orders');
    const customers = await dbGetAll('customers');
    const users = await dbGetAll('users');
    const allItems = await dbGetAll('order_items');

    // 关联客户名
    orders = orders.map(o => {
      const c = customers.find(x => x.id === o.customer_id);
      const u = users.find(x => x.id === o.created_by);
      return { ...o, company_name: c?.company_name || '', contact_name: c?.contact_name || '', creator_name: u?.real_name || '' };
    });

    // 筛选
    if (search) {
      const kw = search.toLowerCase();
      orders = orders.filter(o => (o.company_name || '').toLowerCase().includes(kw) || (o.order_no || '').toLowerCase().includes(kw));
    }
    if (startDate) orders = orders.filter(o => o.order_date >= startDate);
    if (endDate) orders = orders.filter(o => o.order_date <= endDate);
    if (delivery_status) orders = orders.filter(o => o.delivery_status === delivery_status);
    if (payment_status) orders = orders.filter(o => o.payment_status === payment_status);
    if (invoice_status) orders = orders.filter(o => o.invoice_status === invoice_status);
    if (customer_id) orders = orders.filter(o => o.customer_id === parseInt(customer_id));

    orders.sort((a, b) => (b.order_date || '').localeCompare(a.order_date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
    const total = orders.length;
    const start = (parseInt(page) - 1) * parseInt(pageSize);
    const paged = orders.slice(start, start + parseInt(pageSize));
    return { list: paged, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  },

  async _getOrder(id) {
    const orders = await dbGetAll('orders');
    const order = orders.find(o => o.id === id);
    if (!order) throw { response: { status: 404, data: { error: '订单不存在' } } };
    const customers = await dbGetAll('customers');
    const users = await dbGetAll('users');
    const c = customers.find(x => x.id === order.customer_id);
    const u = users.find(x => x.id === order.created_by);
    const items = (await dbGetAll('order_items')).filter(i => i.order_id === id).sort((a, b) => a.sort_order - b.sort_order);
    const logs = (await dbGetAll('order_logs')).filter(l => l.order_id === id).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return {
      ...order,
      company_name: c?.company_name || '',
      contact_name: c?.contact_name || '',
      customer_phone: c?.phone || '',
      customer_address: c?.address || '',
      customer_tax_number: c?.tax_number || '',
      initial_debt: c?.initial_debt || 0,
      creator_name: u?.real_name || '',
      items, logs,
    };
  },

  async _createOrder({ customer_id, order_date, remark, items }) {
    if (!customer_id) throw { response: { status: 400, data: { error: '请选择客户' } } };
    if (!order_date) throw { response: { status: 400, data: { error: '请选择下单日期' } } };
    if (!items || items.length === 0) throw { response: { status: 400, data: { error: '请添加至少一条订单明细' } } };

    const customers = await dbGetAll('customers');
    const customer = customers.find(c => c.id === customer_id);
    if (!customer) throw { response: { status: 400, data: { error: '客户不存在' } } };

    const settings = await getSettingsObj();
    const companyName = settings.company_name || '我公司';
    const existingOrders = await dbGetAll('orders');
    const orderNo = generateOrderNo(customer.company_name, companyName, existingOrders);

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    const orderId = await dbAdd('orders', {
      order_no: orderNo, customer_id, order_date, total_amount: totalAmount,
      remark: remark || '', delivery_status: 'PENDING', payment_status: 'UNPAID',
      paid_amount: 0, invoice_status: 'UNINVOICED',
      created_by: userData.id || 1,
      created_at: new Date().toLocaleString('zh-CN'),
      updated_at: new Date().toLocaleString('zh-CN'),
    });

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      await dbAdd('order_items', {
        order_id: orderId, product_name: item.product_name,
        specification: item.specification || '', unit: item.unit || '',
        quantity: item.quantity || 0, unit_price: item.unit_price || 0,
        subtotal, sort_order: idx,
      });
    }

    await dbAdd('order_logs', {
      order_id: orderId, user_id: userData.id || 1,
      action: '创建订单', detail: `创建订单 ${orderNo}`,
      created_at: new Date().toLocaleString('zh-CN'),
    });

    return { id: orderId, order_no: orderNo, message: '订单创建成功' };
  },

  async _updateOrder(id, { customer_id, order_date, remark, items }) {
    const order = await dbGet('orders', id);
    if (!order) throw { response: { status: 404, data: { error: '订单不存在' } } };

    const totalAmount = (items || []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
    order.customer_id = customer_id ?? order.customer_id;
    order.order_date = order_date ?? order.order_date;
    order.remark = remark ?? order.remark;
    order.total_amount = totalAmount;
    order.updated_at = new Date().toLocaleString('zh-CN');
    await dbPut('orders', order);

    if (items) {
      const allItems = await dbGetAll('order_items');
      for (const item of allItems.filter(i => i.order_id === id)) {
        await dbDelete('order_items', item.id);
      }
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        await dbAdd('order_items', {
          order_id: id, product_name: item.product_name,
          specification: item.specification || '', unit: item.unit || '',
          quantity: item.quantity || 0, unit_price: item.unit_price || 0,
          subtotal, sort_order: idx,
        });
      }
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    await dbAdd('order_logs', {
      order_id: id, user_id: userData.id || 1,
      action: '编辑订单', detail: '编辑订单基本信息或明细',
      created_at: new Date().toLocaleString('zh-CN'),
    });
    return { message: '订单更新成功' };
  },

  async _updateStatus(id, body) {
    const order = await dbGet('orders', id);
    if (!order) throw { response: { status: 404, data: { error: '订单不存在' } } };
    if (body.paid_amount !== undefined && body.paid_amount > order.total_amount) {
      throw { response: { status: 400, data: { error: '已付金额不能超过订单总金额' } } };
    }
    const changes = [];
    if (body.delivery_status !== undefined) { order.delivery_status = body.delivery_status; changes.push(`发货状态→${body.delivery_status}`); }
    if (body.payment_status !== undefined) { order.payment_status = body.payment_status; changes.push(`付款状态→${body.payment_status}`); }
    if (body.paid_amount !== undefined) { order.paid_amount = body.paid_amount; changes.push(`已付金额→${body.paid_amount}`); }
    if (body.invoice_status !== undefined) { order.invoice_status = body.invoice_status; changes.push(`开票状态→${body.invoice_status}`); }
    order.updated_at = new Date().toLocaleString('zh-CN');
    await dbPut('orders', order);

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    await dbAdd('order_logs', {
      order_id: id, user_id: userData.id || 1,
      action: '更新状态', detail: changes.join('; '),
      created_at: new Date().toLocaleString('zh-CN'),
    });
    return { message: '状态更新成功' };
  },

  async _deleteOrder(id) {
    const order = await dbGet('orders', id);
    if (!order) throw { response: { status: 404, data: { error: '订单不存在' } } };
    const allItems = await dbGetAll('order_items');
    for (const item of allItems.filter(i => i.order_id === id)) {
      await dbDelete('order_items', item.id);
    }
    const allLogs = await dbGetAll('order_logs');
    for (const log of allLogs.filter(l => l.order_id === id)) {
      await dbDelete('order_logs', log.id);
    }
    await dbDelete('orders', id);
    return { message: '订单删除成功' };
  },

  // --- 对账单数据 ---
  async _getStatement(customerId, params = {}) {
    const { startDate, endDate } = params;
    const customer = await dbGet('customers', customerId);
    if (!customer) throw { response: { status: 404, data: { error: '客户不存在' } } };
    let orders = await dbGetAll('orders');
    orders = orders.filter(o => o.customer_id === customerId);
    if (startDate) orders = orders.filter(o => o.order_date >= startDate);
    if (endDate) orders = orders.filter(o => o.order_date <= endDate);
    orders.sort((a, b) => (a.order_date || '').localeCompare(b.order_date || ''));
    const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);
    const totalPaid = orders.reduce((s, o) => s + o.paid_amount, 0);
    const initialDebt = customer.initial_debt || 0;
    const balanceDue = initialDebt + totalAmount - totalPaid;
    return {
      customer, orders,
      summary: { initial_debt: initialDebt, total_amount: totalAmount, total_paid: totalPaid, balance_due: balanceDue, order_count: orders.length },
      dateRange: { startDate: startDate || '', endDate: endDate || '' },
    };
  },

  // --- Dashboard 统计 ---
  async _getStats() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const orders = await dbGetAll('orders');
    const customers = await dbGetAll('customers');

    const monthOrders = orders.filter(o => (o.order_date || '').startsWith(yearMonth));
    const monthOrderCount = monthOrders.length;
    const monthOrderTotal = monthOrders.reduce((s, o) => s + o.total_amount, 0);
    const pendingShipmentCount = orders.filter(o => o.delivery_status === 'PENDING').length;
    const unpaidAmount = orders.filter(o => o.payment_status === 'UNPAID' || o.payment_status === 'PARTIAL')
      .reduce((s, o) => s + (o.total_amount - o.paid_amount), 0);
    const customerCount = customers.length;

    const recentOrders = orders.map(o => {
      const c = customers.find(x => x.id === o.customer_id);
      return { ...o, company_name: c?.company_name || '' };
    }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10);

    const dailyMap = {};
    monthOrders.forEach(o => {
      if (!dailyMap[o.order_date]) dailyMap[o.order_date] = { order_date: o.order_date, count: 0, amount: 0 };
      dailyMap[o.order_date].count++;
      dailyMap[o.order_date].amount += o.total_amount;
    });
    const dailyStats = Object.values(dailyMap).sort((a, b) => (a.order_date || '').localeCompare(b.order_date || ''));

    return { monthOrderCount, monthOrderTotal, pendingShipmentCount, unpaidAmount, customerCount, recentOrders, dailyStats };
  },

  // --- 系统设置 ---
  async _updateSettings(body) {
    for (const [key, value] of Object.entries(body)) {
      await dbPutByKey('settings', { key, value: String(value ?? '') });
    }
    return { message: '设置保存成功' };
  },

  // --- 文档生成 ---
  async _renderContract(orderId) {
    const order = await this._getOrder(orderId);
    const settings = await getSettingsObj();
    return this._contractHTML(order, settings);
  },

  async _renderShipping(orderId) {
    const order = await this._getOrder(orderId);
    const settings = await getSettingsObj();
    return this._shippingHTML(order, settings);
  },

  async _renderStatement(customerId, params) {
    const data = await this._getStatement(customerId, params);
    const settings = await getSettingsObj();
    return this._statementHTML(data, settings);
  },

  _docStyle() {
    return `<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"SimSun","宋体","Noto Serif SC",serif;color:#333;padding:40px;max-width:800px;margin:0 auto}.doc-title{text-align:center;font-size:24px;font-weight:bold;margin-bottom:30px;letter-spacing:4px}.doc-header{display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px}.info-row{margin-bottom:8px;font-size:14px;line-height:1.8}.info-row .label{display:inline-block;width:80px;font-weight:bold}table{width:100%;border-collapse:collapse;margin:15px 0;font-size:13px}th,td{border:1px solid #555;padding:8px 10px;text-align:center}th{background:#f0f0f0;font-weight:bold}.amount-row{text-align:right;padding:10px 0;font-size:14px}.amount-row .total{font-size:18px;font-weight:bold;color:#c0392b}.amount-cn{font-size:14px;font-weight:bold;margin:5px 0}.section-title{font-weight:bold;font-size:15px;margin:20px 0 10px}.terms{font-size:13px;line-height:2}.sign-area{display:flex;justify-content:space-between;margin-top:60px;font-size:14px}.sign-block{width:45%}.sign-block .line{border-bottom:1px solid #999;height:30px;margin:5px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#999}@media print{body{padding:20px;max-width:none}.no-print{display:none}@page{size:A4;margin:1.5cm}}.print-btn{position:fixed;top:20px;right:20px;padding:10px 24px;background:#1677ff;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;z-index:999}.print-btn:hover{background:#0958d9}</style>`;
  },

  _contractHTML(order, settings) {
    const itemsRows = order.items.map((item, i) => `<tr><td>${i+1}</td><td>${item.product_name}</td><td>${item.specification||''}</td><td>${item.unit||''}</td><td>${item.quantity}</td><td>${item.unit_price.toFixed(2)}</td><td>${item.subtotal.toFixed(2)}</td></tr>`).join('');
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>购销合同 - ${order.order_no}</title>${this._docStyle()}</head><body><button class="print-btn no-print" onclick="window.print()">打印 / 保存PDF</button><div class="doc-title">购 销 合 同</div><div class="doc-header"><span>合同编号：${order.order_no}</span><span>签订日期：${order.order_date}</span></div><div class="info-row"><span class="label">甲方（买方）：</span>${order.company_name}</div><div class="info-row"><span class="label">联系人：</span>${order.contact_name||''}　<span class="label">电话：</span>${order.customer_phone||''}</div><div class="info-row"><span class="label">地址：</span>${order.customer_address||''}　<span class="label">税号：</span>${order.customer_tax_number||''}</div><div class="info-row"><span class="label">乙方（卖方）：</span>${settings.company_name||''}</div><div class="info-row"><span class="label">联系人：</span>${settings.company_contact||''}　<span class="label">电话：</span>${settings.company_phone||''}</div><div class="info-row"><span class="label">地址：</span>${settings.company_address||''}</div><p style="font-size:13px;margin:15px 0;">甲乙双方本着平等互利、诚实信用的原则，经友好协商，就以下产品购销事宜达成如下协议：</p><div class="section-title">一、产品明细</div><table><thead><tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价(元)</th><th>小计(元)</th></tr></thead><tbody>${itemsRows}<tr><td colspan="6" style="text-align:right;font-weight:bold;">合计金额（小写）：</td><td style="font-weight:bold;color:#c0392b;">¥${order.total_amount.toFixed(2)}</td></tr></tbody></table><div class="amount-cn">合计金额（大写）：${toChineseAmount(order.total_amount)}</div><div class="section-title">二、付款方式</div><div class="terms">1. 付款方式：${order.payment_status==='PAID'?'已付清':order.payment_status==='PARTIAL'?`部分付款，已付 ¥${order.paid_amount.toFixed(2)}`:'尚未付款'}。<br>2. 甲方应在收到货物后按约定时间向乙方支付货款。<br>3. 乙方收款账户：${settings.company_bank||'________'}　账号：${settings.company_bank_account||'________'}</div><div class="section-title">三、交货条款</div><div class="terms">1. 交货日期：双方另行协商确定。<br>2. 交货方式：乙方负责将货物运输至甲方指定地点。<br>3. 运输费用由乙方承担。</div><div class="section-title">四、其他约定</div><div class="terms">1. 本合同一式两份，甲乙双方各执一份，具有同等法律效力。<br>2. 本合同自双方签字盖章之日起生效。<br>${order.remark?`3. 备注：${order.remark}`:''}</div><div class="sign-area"><div class="sign-block"><div>甲方（盖章）：${order.company_name}</div><div class="line"></div><div>授权代表签字：</div><div class="line"></div><div>日期：${order.order_date}</div></div><div class="sign-block"><div>乙方（盖章）：${settings.company_name||''}</div><div class="line"></div><div>授权代表签字：</div><div class="line"></div><div>日期：${order.order_date}</div></div></div><div class="footer">本合同由企业订单管理系统自动生成</div></body></html>`;
  },

  _shippingHTML(order, settings) {
    const itemsRows = order.items.map((item,i)=>`<tr><td>${i+1}</td><td>${item.product_name}</td><td>${item.specification||''}</td><td>${item.unit||''}</td><td>${item.quantity}</td><td></td></tr>`).join('');
    const today = new Date().toISOString().slice(0,10);
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>发货单 - ${order.order_no}</title>${this._docStyle()}</head><body><button class="print-btn no-print" onclick="window.print()">打印 / 保存PDF</button><div class="doc-title">发 货 单</div><div class="doc-header"><span>发货单号：${order.order_no}-FH</span><span>发货日期：${today}</span></div><div class="info-row"><span class="label">订单编号：</span>${order.order_no}</div><div class="info-row"><span class="label">收货单位：</span>${order.company_name}</div><div class="info-row"><span class="label">联系人：</span>${order.contact_name||''}　<span class="label">电话：</span>${order.customer_phone||''}</div><div class="info-row"><span class="label">收货地址：</span>${order.customer_address||''}</div><div class="info-row"><span class="label">发货单位：</span>${settings.company_name||''}　<span class="label">电话：</span>${settings.company_phone||''}</div><div class="section-title">发货明细</div><table><thead><tr><th>序号</th><th>产品名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>备注</th></tr></thead><tbody>${itemsRows}</tbody></table><div class="info-row" style="margin-top:15px;"><span class="label">合计数量：</span>${order.items.reduce((s,i)=>s+i.quantity,0)} ${order.items[0]?.unit||''}</div><div class="info-row"><span class="label">备注：</span>${order.remark||''}</div><div class="sign-area"><div class="sign-block"><div>发货人签字：</div><div class="line"></div><div>发货日期：${today}</div></div><div class="sign-block"><div>收货人签字：</div><div class="line"></div><div>收货日期：　　　　年　　月　　日</div></div></div><div class="footer">本发货单由企业订单管理系统自动生成</div></body></html>`;
  },

  _statementHTML(data, settings) {
    const { customer, orders, summary, dateRange } = data;
    const itemsRows = orders.map((o,i)=>`<tr><td>${i+1}</td><td>${o.order_no}</td><td>${o.order_date}</td><td style="text-align:right;">¥${o.total_amount.toFixed(2)}</td><td style="text-align:right;">¥${o.paid_amount.toFixed(2)}</td><td style="text-align:right;">¥${(o.total_amount-o.paid_amount).toFixed(2)}</td></tr>`).join('');
    const today = new Date().toISOString().slice(0,10);
    const period = dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} 至 ${dateRange.endDate}` : '全部';
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>对账单 - ${customer.company_name}</title>${this._docStyle()}</head><body><button class="print-btn no-print" onclick="window.print()">打印 / 保存PDF</button><div class="doc-title">对 账 单</div><div class="doc-header"><span>客户：${customer.company_name}</span><span>对账日期：${today}</span></div><div class="info-row"><span class="label">客户名称：</span>${customer.company_name}</div><div class="info-row"><span class="label">联系人：</span>${customer.contact_name||''}　<span class="label">电话：</span>${customer.phone||''}</div><div class="info-row"><span class="label">对账周期：</span>${period}</div><div class="section-title">订单明细汇总</div><table><thead><tr><th>序号</th><th>订单编号</th><th>下单日期</th><th>订单金额</th><th>已付金额</th><th>未付金额</th></tr></thead><tbody>${itemsRows||'<tr><td colspan="6" style="text-align:center;">该时间段内无订单记录</td></tr>'}</tbody></table><div style="margin-top:20px;font-size:14px;line-height:2.5;"><div class="amount-row">期初欠款（上期结余）：¥${summary.initial_debt.toFixed(2)}</div><div class="amount-row">本期订单总金额：¥${summary.total_amount.toFixed(2)}</div><div class="amount-row">本期已付金额：¥${summary.total_paid.toFixed(2)}</div><div class="amount-row"><span class="total">本期应付金额：¥${summary.balance_due.toFixed(2)}</span></div><div class="amount-cn">大写：${toChineseAmount(summary.balance_due)}</div></div><p style="font-size:13px;margin-top:20px;line-height:2;">本期应付 = 期初欠款 + 本期订单总金额 - 本期已付金额<br>请核对以上账目，如有异议请在收到本对账单后7个工作日内联系我方。</p><div class="sign-area"><div class="sign-block"><div>制表单位（盖章）：${settings.company_name||''}</div><div class="line"></div><div>制表日期：${today}</div></div><div class="sign-block"><div>客户确认（盖章）：${customer.company_name}</div><div class="line"></div><div>确认日期：　　　　年　　月　　日</div></div></div><div class="footer">本对账单由企业订单管理系统自动生成</div></body></html>`;
  },
};

export default api;
