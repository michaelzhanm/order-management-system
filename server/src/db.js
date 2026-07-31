import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/app.db');

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表结构
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK(role IN ('ADMIN','EMPLOYEE')),
      real_name TEXT,
      phone TEXT,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      address TEXT,
      tax_number TEXT,
      initial_debt REAL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      order_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      remark TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(delivery_status IN ('PENDING','SHIPPED','RECEIVED')),
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PARTIAL','PAID')),
      paid_amount REAL DEFAULT 0,
      invoice_status TEXT NOT NULL DEFAULT 'UNINVOICED' CHECK(invoice_status IN ('UNINVOICED','INVOICED')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      specification TEXT,
      unit TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS order_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // 插入默认管理员
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, real_name, must_change_password)
      VALUES (?, ?, 'ADMIN', '系统管理员', 1)
    `).run('admin', hash);
  }

  // 插入默认系统配置（乙方公司信息）
  const defaults = {
    company_name: '我公司',
    company_contact: '',
    company_phone: '',
    company_address: '',
    company_tax_number: '',
    company_bank: '',
    company_bank_account: '',
  };
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) {
    stmt.run(k, v);
  }

  console.log('[DB] 数据库初始化完成');
}

export default db;
