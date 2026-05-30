/**
 * SQLite 数据库连接和初始化工具
 */

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import type { Database as DatabaseConnection } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getLegacyPasswordCategoryEntries, normalizePasswordCategory } from '../../src/constants/passwordCategories';

let databaseConnection: DatabaseConnection | null = null;

interface CountRow {
  total: number;
}

interface TableColumnRow {
  name: string;
}

export interface ArchiveProfileRow {
  id: string;
  name: string;
  password_hash: string;
}

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  status: string;
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
  profileId: string;
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

export interface FileAssetInput {
  id: string;
  profileId: string;
  module: string;
  category: string | null;
  title: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  remark: string | null;
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

    -- 档案配置表：不同密码进入不同档案空间
    CREATE TABLE IF NOT EXISTS archive_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 用户表：使用账号密码登录，不同用户的数据通过 user_id 隔离
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
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
  migrateLegacyPasswordCategories(database);
  migrateArchiveProfilesToUsers(database);
  ensureDefaultUsers(database);
  ensureDefaultProfiles(database);
  migrateOwnerDataToProfiles(database);
};

/**
 * 迁移历史密码分类
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当迁移失败时抛出异常
 */
const migrateLegacyPasswordCategories = (database: DatabaseConnection): void => {
  const updateCategory = database.prepare(`
    UPDATE password_items
    SET category = ?
    WHERE category = ?
  `);

  for (const [legacyCategory, normalizedCategory] of getLegacyPasswordCategoryEntries()) {
    updateCategory.run(normalizedCategory, legacyCategory);
  }
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
 * 将历史档案配置迁移为用户账号
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当迁移失败时抛出异常
 */
const migrateArchiveProfilesToUsers = (database: DatabaseConnection): void => {
  const profiles = database.prepare('SELECT id, name, password_hash FROM archive_profiles').all() as ArchiveProfileRow[];
  const insertUser = database.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING
  `);

  for (const profile of profiles) {
    insertUser.run(profile.id, profile.id === 'personal' ? 'xinjie' : profile.id, profile.name, profile.password_hash);
  }
};

/**
 * 初始化默认用户账号
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当写入失败时抛出异常
 */
const ensureDefaultUsers = (database: DatabaseConnection): void => {
  const personalPassword = process.env.NUXT_PERSONAL_ACCOUNT_PASSWORD || process.env.NUXT_PERSONAL_ARCHIVE_PASSWORD || 'xinjie123';
  const demoPassword = process.env.NUXT_DEMO_ACCOUNT_PASSWORD || process.env.NUXT_DEMO_ARCHIVE_PASSWORD || '123456';
  const insertUser = database.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING
  `);
  const updateUserPassword = database.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  insertUser.run('personal', 'xinjie', '个人档案', bcrypt.hashSync(personalPassword, 12));
  insertUser.run('demo', 'demo', '演示账号', bcrypt.hashSync(demoPassword, 12));

  if (process.env.NUXT_PERSONAL_ACCOUNT_PASSWORD || process.env.NUXT_PERSONAL_ARCHIVE_PASSWORD) {
    updateUserPassword.run(bcrypt.hashSync(personalPassword, 12), 'personal');
  }

  if (process.env.NUXT_DEMO_ACCOUNT_PASSWORD || process.env.NUXT_DEMO_ARCHIVE_PASSWORD) {
    updateUserPassword.run(bcrypt.hashSync(demoPassword, 12), 'demo');
  }
};

/**
 * 初始化默认档案
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当写入失败时抛出异常
 */
const ensureDefaultProfiles = (database: DatabaseConnection): void => {
  const personalPassword = process.env.NUXT_PERSONAL_ARCHIVE_PASSWORD || 'xinjie123';
  const demoPassword = process.env.NUXT_DEMO_ARCHIVE_PASSWORD || '123456';
  const insertProfile = database.prepare(`
    INSERT INTO archive_profiles (id, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING
  `);
  const updateProfilePassword = database.prepare(`
    UPDATE archive_profiles
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  insertProfile.run('personal', '个人档案', bcrypt.hashSync(personalPassword, 12));
  insertProfile.run('demo', '演示档案', bcrypt.hashSync(demoPassword, 12));

  if (process.env.NUXT_PERSONAL_ARCHIVE_PASSWORD) {
    updateProfilePassword.run(bcrypt.hashSync(personalPassword, 12), 'personal');
  }

  if (process.env.NUXT_DEMO_ARCHIVE_PASSWORD) {
    updateProfilePassword.run(bcrypt.hashSync(demoPassword, 12), 'demo');
  }
};

/**
 * 将旧 owner 数据迁移到档案空间
 * @param database - SQLite 数据库连接
 * @returns 无返回值
 * @throws 当迁移失败时抛出异常
 */
const migrateOwnerDataToProfiles = (database: DatabaseConnection): void => {
  database
    .prepare("UPDATE password_items SET user_id = 'demo' WHERE user_id = 'owner' AND id LIKE 'seed-%'")
    .run();
  database
    .prepare("UPDATE file_assets SET user_id = 'demo' WHERE user_id = 'owner' AND id LIKE 'seed-%'")
    .run();
  database
    .prepare("UPDATE file_assets SET storage_path = 'demo/' || storage_path WHERE user_id = 'demo' AND id LIKE 'seed-%' AND storage_path NOT LIKE 'demo/%'")
    .run();
  database
    .prepare("UPDATE password_items SET user_id = 'personal' WHERE user_id = 'owner'")
    .run();
  database
    .prepare("UPDATE file_assets SET user_id = 'personal' WHERE user_id = 'owner'")
    .run();
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
 * 查询所有档案配置
 * @returns 档案配置列表
 * @throws 当查询失败时抛出异常
 */
export const listArchiveProfiles = (): ArchiveProfileRow[] => {
  const database = getDatabase();
  return database
    .prepare('SELECT id, name, password_hash FROM archive_profiles ORDER BY created_at ASC')
    .all() as ArchiveProfileRow[];
};

/**
 * 查询所有用户账号
 * @returns 用户账号列表
 * @throws 当查询失败时抛出异常
 */
export const listUsers = (): UserRow[] => {
  const database = getDatabase();
  return database
    .prepare('SELECT id, username, display_name, password_hash, status FROM users ORDER BY created_at ASC')
    .all() as UserRow[];
};

/**
 * 按账号查询用户
 * @param username - 登录账号
 * @returns 用户账号，不存在时返回 null
 * @throws 当查询失败时抛出异常
 */
export const getUserByUsername = (username: string): UserRow | null => {
  const database = getDatabase();
  const row = database
    .prepare('SELECT id, username, display_name, password_hash, status FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;

  return row || null;
};

/**
 * 统计用户账号数量
 * @returns 用户账号数量
 * @throws 当查询失败时抛出异常
 */
export const countUsers = (): number => {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) AS total FROM users').get() as CountRow;
  return row.total;
};

/**
 * 统计指定用户的密码记录数量
 * @param profileId - 档案标识
 * @returns 密码记录数量
 * @throws 当查询失败时抛出异常
 */
export const countPasswords = (profileId: string): number => {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) AS total FROM password_items WHERE user_id = ?').get(profileId) as CountRow;
  return row.total;
};

/**
 * 统计指定用户和模块的文件数量
 * @param profileId - 档案标识
 * @param module - 文件所属模块
 * @returns 文件数量
 * @throws 当查询失败时抛出异常
 */
export const countFilesByModule = (profileId: string, module: string): number => {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) AS total FROM file_assets WHERE user_id = ? AND module = ?').get(profileId, module) as CountRow;
  return row.total;
};

/**
 * 查询指定用户的密码记录列表
 * @param profileId - 档案标识
 * @param keyword - 搜索关键词
 * @returns 密码记录列表
 * @throws 当查询失败时抛出异常
 */
export const listPasswordItems = (profileId: string, keyword: string): PasswordItemRow[] => {
  const database = getDatabase();
  const normalizedKeyword = `%${keyword.trim()}%`;

  if (!keyword.trim()) {
    const rows = database
      .prepare(`
        SELECT id, title, category, login_url, login_method, account, password, phone, email, remark, updated_at
        FROM password_items
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `)
      .all(profileId) as PasswordItemRow[];

    return rows.map((item) => ({
      ...item,
      category: normalizePasswordCategory(item.category)
    }));
  }

  const rows = database
    .prepare(`
      SELECT id, title, category, login_url, login_method, account, password, phone, email, remark, updated_at
      FROM password_items
      WHERE user_id = ?
        AND (title LIKE ? OR category LIKE ? OR account LIKE ? OR remark LIKE ?)
      ORDER BY updated_at DESC
    `)
    .all(profileId, normalizedKeyword, normalizedKeyword, normalizedKeyword, normalizedKeyword) as PasswordItemRow[];

  return rows.map((item) => ({
    ...item,
    category: normalizePasswordCategory(item.category)
  }));
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
      input.profileId,
      input.title,
      normalizePasswordCategory(input.category),
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
      normalizePasswordCategory(input.category),
      input.loginUrl,
      input.loginMethod,
      input.account,
      input.password,
      input.phone,
      input.email,
      input.remark,
      input.id,
      input.profileId
    );

  return result.changes > 0;
};

/**
 * 删除密码记录
 * @param id - 密码记录标识
 * @param profileId - 档案标识
 * @returns 是否删除成功
 * @throws 当删除失败时抛出异常
 */
export const deletePasswordItem = (id: string, profileId: string): boolean => {
  const database = getDatabase();
  const result = database.prepare('DELETE FROM password_items WHERE id = ? AND user_id = ?').run(id, profileId);
  return result.changes > 0;
};

/**
 * 查询指定用户和模块的文件资产列表
 * @param profileId - 档案标识
 * @param module - 文件所属模块
 * @param keyword - 搜索关键词
 * @returns 文件资产列表
 * @throws 当查询失败时抛出异常
 */
export const listFileAssets = (profileId: string, module: string, keyword: string): FileAssetRow[] => {
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
      .all(profileId, module) as FileAssetRow[];
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
    .all(profileId, module, normalizedKeyword, normalizedKeyword, normalizedKeyword, normalizedKeyword) as FileAssetRow[];
};

/**
 * 查询指定文件资产
 * @param profileId - 档案标识
 * @param module - 文件所属模块
 * @param id - 文件资产标识
 * @returns 文件资产，不存在时返回 null
 * @throws 当查询失败时抛出异常
 */
export const getFileAssetById = (profileId: string, module: string, id: string): FileAssetRow | null => {
  const database = getDatabase();
  const row = database
    .prepare(`
      SELECT id, module, category, title, original_name, storage_path, mime_type, size, remark, updated_at
      FROM file_assets
      WHERE id = ? AND user_id = ? AND module = ?
    `)
    .get(id, profileId, module) as FileAssetRow | undefined;

  return row || null;
};

/**
 * 新增文件资产索引
 * @param input - 文件资产输入
 * @returns 新增后的文件资产标识
 * @throws 当写入失败时抛出异常
 */
export const createFileAsset = (input: FileAssetInput): string => {
  const database = getDatabase();
  database
    .prepare(`
      INSERT INTO file_assets (
        id, user_id, module, category, title, original_name, storage_path, mime_type, size, remark, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    .run(
      input.id,
      input.profileId,
      input.module,
      input.category,
      input.title,
      input.originalName,
      input.storagePath,
      input.mimeType,
      input.size,
      input.remark
    );

  return input.id;
};

/**
 * 更新文件资产索引
 * @param input - 文件资产输入
 * @returns 是否更新成功
 * @throws 当写入失败时抛出异常
 */
export const updateFileAsset = (input: FileAssetInput): boolean => {
  const database = getDatabase();
  const result = database
    .prepare(`
      UPDATE file_assets
      SET
        category = ?,
        title = ?,
        original_name = ?,
        storage_path = ?,
        mime_type = ?,
        size = ?,
        remark = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND module = ?
    `)
    .run(
      input.category,
      input.title,
      input.originalName,
      input.storagePath,
      input.mimeType,
      input.size,
      input.remark,
      input.id,
      input.profileId,
      input.module
    );

  return result.changes > 0;
};

/**
 * 删除文件资产索引
 * @param id - 文件资产标识
 * @param profileId - 档案标识
 * @param module - 文件所属模块
 * @returns 是否删除成功
 * @throws 当删除失败时抛出异常
 */
export const deleteFileAsset = (id: string, profileId: string, module: string): boolean => {
  const database = getDatabase();
  const result = database.prepare('DELETE FROM file_assets WHERE id = ? AND user_id = ? AND module = ?').run(id, profileId, module);
  return result.changes > 0;
};
