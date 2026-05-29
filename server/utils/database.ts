/**
 * SQLite 数据库连接和初始化工具
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseConnection } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let databaseConnection: DatabaseConnection | null = null;

interface CountRow {
  total: number;
}

interface TableColumnRow {
  name: string;
}

export interface PasswordItemRow {
  id: string;
  title: string;
  category: string;
  login_url: string | null;
  login_method: string | null;
  account: string | null;
  password: string | null;
  phone: string | null;
  email: string | null;
  remark: string | null;
  updated_at: string;
}

export interface PasswordItemInput {
  id: string;
  userId: string;
  title: string;
  category: string;
  loginUrl: string | null;
  loginMethod: string | null;
  account: string | null;
  password: string | null;
  phone: string | null;
  email: string | null;
  remark: string | null;
}

export interface FileAssetRow {
  id: string;
  module: string;
  category: string | null;
  title: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  remark: string | null;
  updated_at: string;
}

/**
 * 获取数据库文件路径
 * @returns SQLite 数据库绝对路径
 * @throws 不抛出异常
 */
export const getDatabasePath = (): string => {
  return resolve(process.env.NUXT_DATABASE_PATH || './data/archive.db');
};

/**
 * 获取 SQLite 数据库连接
 * @returns SQLite 数据库连接
 * @throws 当数据库文件无法创建或打开时抛出异常
 */
export const getDatabase = (): DatabaseConnection => {
  if (databaseConnection) {
    return databaseConnection;
  }

  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  databaseConnection = new Database(databasePath);
  databaseConnection.pragma('journal_mode = WAL');
  databaseConnection.pragma('foreign_keys = ON');
  initializeDatabase(databaseConnection);

  return databaseConnection;
};

/**
 * 初始化数据库表结构
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当建表失败时抛出异常
 */
const initializeDatabase = (database: DatabaseConnection): void => {
  database.exec(`
    -- 系统设置表：保存个人密码哈希等应用级配置
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 密码资料表：保存平台账号、登录方式、密码和备注
    CREATE TABLE IF NOT EXISTS password_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      login_url TEXT,
      login_method TEXT,
      account TEXT,
      password TEXT,
      phone TEXT,
      email TEXT,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 文件资产表：统一保存文档、简历、图片、证件和学习资料的文件索引
    CREATE TABLE IF NOT EXISTS file_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module TEXT NOT NULL,
      category TEXT,
      title TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 文件资产模块索引：提升按模块统计和列表查询性能
    CREATE INDEX IF NOT EXISTS idx_file_assets_user_module ON file_assets(user_id, module);
  `);

  migratePasswordItemColumns(database);
};

/**
 * 补齐历史密码表字段
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当迁移失败时抛出异常
 */
const migratePasswordItemColumns = (database: DatabaseConnection): void => {
  const columns = database.prepare('PRAGMA table_info(password_items)').all() as TableColumnRow[];
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has('phone')) {
    database.exec('ALTER TABLE password_items ADD COLUMN phone TEXT');
  }

  if (!columnNames.has('email')) {
    database.exec('ALTER TABLE password_items ADD COLUMN email TEXT');
  }
};

/**
 * 获取应用设置
 * @param key - 设置键名
 * @returns 设置值，未找到时返回 null
 * @throws 当查询失败时抛出异常
 */
export const getSetting = (key: string): string | null => {
  const database = getDatabase();
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
};

/**
 * 写入应用设置
 * @param key - 设置键名
 * @param value - 设置值
 * @returns 无返回值
 * @throws 当写入失败时抛出异常
 */
export const setSetting = (key: string, value: string): void => {
  const database = getDatabase();
  database
    .prepare(`
      INSERT INTO app_settings (key, value, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .run(key, value);
};

/**
 * 统计指定用户的密码记录数量
 * @param userId - 用户标识
 * @returns 密码记录数量
 * @throws 当查询失败时抛出异常
 */
export const countPasswords = (userId: string): number => {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) AS total FROM password_items WHERE user_id = ?').get(userId) as CountRow;
  return row.total;
};

/**
 * 统计指定用户和模块的文件数量
 * @param userId - 用户标识
 * @param module - 文件所属模块
 * @returns 文件数量
 * @throws 当查询失败时抛出异常
 */
export const countFilesByModule = (userId: string, module: string): number => {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) AS total FROM file_assets WHERE user_id = ? AND module = ?').get(userId, module) as CountRow;
  return row.total;
};

/**
 * 查询指定用户的密码记录列表
 * @param userId - 用户标识
 * @param keyword - 搜索关键词
 * @returns 密码记录列表
 * @throws 当查询失败时抛出异常
 */
export const listPasswordItems = (userId: string, keyword: string): PasswordItemRow[] => {
  const database = getDatabase();
  const normalizedKeyword = `%${keyword.trim()}%`;

  if (!keyword.trim()) {
    return database
      .prepare(`
        SELECT id, title, category, login_url, login_method, account, password, phone, email, remark, updated_at
        FROM password_items
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `)
      .all(userId) as PasswordItemRow[];
  }

  return database
    .prepare(`
      SELECT id, title, category, login_url, login_method, account, password, phone, email, remark, updated_at
      FROM password_items
      WHERE user_id = ?
        AND (title LIKE ? OR category LIKE ? OR account LIKE ? OR remark LIKE ?)
      ORDER BY updated_at DESC
    `)
    .all(userId, normalizedKeyword, normalizedKeyword, normalizedKeyword, normalizedKeyword) as PasswordItemRow[];
};

/**
 * 新增密码记录
 * @param input - 密码记录输入
 * @returns 新增后的记录标识
 * @throws 当写入失败时抛出异常
 */
export const createPasswordItem = (input: PasswordItemInput): string => {
  const database = getDatabase();
  database
    .prepare(`
      INSERT INTO password_items (
        id, user_id, title, category, login_url, login_method, account, password, phone, email, remark, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    .run(
      input.id,
      input.userId,
      input.title,
      input.category,
      input.loginUrl,
      input.loginMethod,
      input.account,
      input.password,
      input.phone,
      input.email,
      input.remark
    );

  return input.id;
};

/**
 * 更新密码记录
 * @param input - 密码记录输入
 * @returns 是否更新成功
 * @throws 当写入失败时抛出异常
 */
export const updatePasswordItem = (input: PasswordItemInput): boolean => {
  const database = getDatabase();
  const result = database
    .prepare(`
      UPDATE password_items
      SET
        title = ?,
        category = ?,
        login_url = ?,
        login_method = ?,
        account = ?,
        password = ?,
        phone = ?,
        email = ?,
        remark = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `)
    .run(
      input.title,
      input.category,
      input.loginUrl,
      input.loginMethod,
      input.account,
      input.password,
      input.phone,
      input.email,
      input.remark,
      input.id,
      input.userId
    );

  return result.changes > 0;
};

/**
 * 删除密码记录
 * @param id - 密码记录标识
 * @param userId - 用户标识
 * @returns 是否删除成功
 * @throws 当删除失败时抛出异常
 */
export const deletePasswordItem = (id: string, userId: string): boolean => {
  const database = getDatabase();
  const result = database.prepare('DELETE FROM password_items WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
};

/**
 * 查询指定用户和模块的文件资产列表
 * @param userId - 用户标识
 * @param module - 文件所属模块
 * @param keyword - 搜索关键词
 * @returns 文件资产列表
 * @throws 当查询失败时抛出异常
 */
export const listFileAssets = (userId: string, module: string, keyword: string): FileAssetRow[] => {
  const database = getDatabase();
  const normalizedKeyword = `%${keyword.trim()}%`;

  if (!keyword.trim()) {
    return database
      .prepare(`
        SELECT id, module, category, title, original_name, storage_path, mime_type, size, remark, updated_at
        FROM file_assets
        WHERE user_id = ? AND module = ?
        ORDER BY updated_at DESC
      `)
      .all(userId, module) as FileAssetRow[];
  }

  return database
    .prepare(`
      SELECT id, module, category, title, original_name, storage_path, mime_type, size, remark, updated_at
      FROM file_assets
      WHERE user_id = ?
        AND module = ?
        AND (title LIKE ? OR category LIKE ? OR original_name LIKE ? OR remark LIKE ?)
      ORDER BY updated_at DESC
    `)
    .all(userId, module, normalizedKeyword, normalizedKeyword, normalizedKeyword, normalizedKeyword) as FileAssetRow[];
};
