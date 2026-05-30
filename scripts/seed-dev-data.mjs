/**
 * 文件说明：开发环境假数据填充脚本
 * 样式说明：不涉及样式
 * 关键布局说明：不涉及布局
 */

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const databasePath = resolve(process.env.NUXT_DATABASE_PATH || './data/archive.db');
const uploadsDir = resolve(process.env.NUXT_UPLOADS_DIR || './uploads');
const profileId = 'demo';

/**
 * 初始化脚本需要的数据库表
 * @param {import('better-sqlite3').Database} database - SQLite 数据库连接
 * @returns {void}
 * @throws 当建表失败时抛出错误
 */
const initializeDatabase = (database) => {
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
};

/**
 * 写入开发示例文件，确保文件路径可以真实存在
 * @param {string} storagePath - 相对上传目录的文件路径
 * @param {string} content - 文件内容
 * @returns {number} 文件字节大小
 * @throws 当目录或文件写入失败时抛出错误
 */
const writeSampleFile = (storagePath, content) => {
  const absolutePath = resolve(uploadsDir, storagePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
  return Buffer.byteLength(content, 'utf8');
};

/**
 * 初始化默认档案密码
 * @param {import('better-sqlite3').Database} database - SQLite 数据库连接
 * @returns {void}
 * @throws 当写入失败时抛出错误
 */
const seedProfiles = (database) => {
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

const passwordItems = [
  ['seed-password-csdn', 'CSDN 博客', '学习内容', 'https://www.csdn.net', '手机号', '13800000001', 'Archive@csdn2026', '13800000001', 'dev@example.com', '技术文章和评论账号'],
  ['seed-password-aliyun', '阿里云控制台', '云服务', 'https://ecs.console.aliyun.com', '邮箱', 'archive@example.com', 'Aliyun@demo2026', '13800000002', 'archive@example.com', 'ECS 和域名控制台'],
  ['seed-password-wechat', '微信开放平台', '社交通讯', 'https://open.weixin.qq.com', '微信', 'archive-wechat', 'Wechat@demo2026', '13800000003', '', '绑定个人微信号 archive-wechat'],
  ['seed-password-github', 'GitHub', '开发平台', 'https://github.com', 'GitHub', 'archive-dev', 'Github@demo2026', '', 'dev@example.com', '代码仓库和部署集成'],
  ['seed-password-google', 'Google 账号', '邮箱账号', 'https://accounts.google.com', '邮箱', 'archive.dev@gmail.com', 'Google@demo2026', '', 'archive.dev@gmail.com', '浏览器同步和开发服务'],
  ['seed-password-qqmail', 'QQ 邮箱', '邮箱账号', 'https://mail.qq.com', 'QQ', '100000001', 'Qqmail@demo2026', '13800000004', '100000001@qq.com', '常用收件邮箱'],
  ['seed-password-cmb', '招商银行 App', '银行金融', 'https://www.cmbchina.com', '手机号', '13800000005', 'Bank@demo2026', '13800000005', '', '工资卡与常用银行卡账号'],
  ['seed-password-steam', 'Steam', '游戏娱乐', 'https://store.steampowered.com', '邮箱', 'game@example.com', 'Steam@demo2026', '', 'game@example.com', '游戏库和社区账号']
];

const fileAssets = [
  {
    id: 'seed-doc-nuxt-plan',
    module: 'documents',
    category: '项目文档',
    title: 'Nuxt 4 部署笔记',
    originalName: 'nuxt-deploy.md',
    storagePath: 'demo/documents/nuxt-deploy.md',
    mimeType: 'text/markdown',
    remark: 'Nuxt 部署到阿里云 ECS 的步骤记录',
    content: '# Nuxt 4 部署笔记\n\n- 使用 PM2 单实例运行\n- SQLite 放在 ECS 数据盘\n- Nginx 反向代理到 Nuxt 服务\n'
  },
  {
    id: 'seed-doc-sqlite-note',
    module: 'documents',
    category: '数据库',
    title: 'SQLite 使用说明',
    originalName: 'sqlite-note.md',
    storagePath: 'demo/documents/sqlite-note.md',
    mimeType: 'text/markdown',
    remark: '个人项目 SQLite 使用注意事项',
    content: '# SQLite 使用说明\n\nSQLite 适合单人低并发场景，数据库文件建议放在本地云盘。\n'
  },
  {
    id: 'seed-resume-java',
    module: 'resumes',
    category: 'Java 后端',
    title: 'Java 后端简历',
    originalName: 'java-backend-resume.md',
    storagePath: 'demo/resumes/java-backend-resume.md',
    mimeType: 'text/markdown',
    remark: '模拟简历文件，后续可替换为 docx 或 pdf',
    content: '# Java 后端简历\n\n姓名：示例\n方向：Java 后端开发\n'
  },
  {
    id: 'seed-resume-common',
    module: 'resumes',
    category: '通用',
    title: '通用中文简历',
    originalName: 'common-resume.md',
    storagePath: 'demo/resumes/common-resume.md',
    mimeType: 'text/markdown',
    remark: '通用投递版本',
    content: '# 通用中文简历\n\n这是开发环境示例文件。\n'
  },
  {
    id: 'seed-image-id-photo',
    module: 'images',
    category: '证件照',
    title: '蓝底证件照',
    originalName: 'id-photo.txt',
    storagePath: 'demo/images/id-photo.txt',
    mimeType: 'text/plain',
    remark: '占位文件，真实项目中替换为图片',
    content: '这是证件照占位文件，后续上传真实图片。\n'
  },
  {
    id: 'seed-image-life',
    module: 'images',
    category: '生活照',
    title: '生活照精选',
    originalName: 'life-photo.txt',
    storagePath: 'demo/images/life-photo.txt',
    mimeType: 'text/plain',
    remark: '占位文件，真实项目中替换为图片',
    content: '这是生活照占位文件，后续上传真实图片。\n'
  },
  {
    id: 'seed-certificate-id-card',
    module: 'certificates',
    category: '身份证',
    title: '身份证正反面',
    originalName: 'id-card.txt',
    storagePath: 'demo/certificates/id-card.txt',
    mimeType: 'text/plain',
    remark: '占位文件，真实项目中替换为证件截图',
    content: '这是身份证占位文件，后续上传真实证件图片。\n'
  },
  {
    id: 'seed-certificate-degree',
    module: 'certificates',
    category: '学历证明',
    title: '学位证书',
    originalName: 'degree.txt',
    storagePath: 'demo/certificates/degree.txt',
    mimeType: 'text/plain',
    remark: '占位文件，真实项目中替换为证书扫描件',
    content: '这是学位证书占位文件，后续上传真实扫描件。\n'
  },
  {
    id: 'seed-study-vue',
    module: 'study',
    category: '前端',
    title: 'Vue 学习资料',
    originalName: 'vue-study.md',
    storagePath: 'demo/study/vue-study.md',
    mimeType: 'text/markdown',
    remark: 'Vue 和 Nuxt 学习资料索引',
    content: '# Vue 学习资料\n\n- Composition API\n- Nuxt 4\n- SCSS 组件化\n'
  },
  {
    id: 'seed-study-db',
    module: 'study',
    category: '数据库',
    title: '数据库复习资料',
    originalName: 'database-study.md',
    storagePath: 'demo/study/database-study.md',
    mimeType: 'text/markdown',
    remark: 'SQLite 和 SQL 基础复习',
    content: '# 数据库复习资料\n\n- 参数化查询\n- 索引\n- 事务\n'
  }
];

mkdirSync(dirname(databasePath), { recursive: true });
mkdirSync(uploadsDir, { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
initializeDatabase(database);
seedProfiles(database);

const insertPassword = database.prepare(`
  INSERT INTO password_items (
    id, user_id, title, category, login_url, login_method, account, password, phone, email, remark, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    user_id = excluded.user_id,
    title = excluded.title,
    category = excluded.category,
    login_url = excluded.login_url,
    login_method = excluded.login_method,
    account = excluded.account,
    password = excluded.password,
    phone = excluded.phone,
    email = excluded.email,
    remark = excluded.remark,
    updated_at = CURRENT_TIMESTAMP
`);

const insertFileAsset = database.prepare(`
  INSERT INTO file_assets (
    id, user_id, module, category, title, original_name, storage_path, mime_type, size, remark, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    user_id = excluded.user_id,
    module = excluded.module,
    category = excluded.category,
    title = excluded.title,
    original_name = excluded.original_name,
    storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    size = excluded.size,
    remark = excluded.remark,
    updated_at = CURRENT_TIMESTAMP
`);

const seedTransaction = database.transaction(() => {
  for (const item of passwordItems) {
    insertPassword.run(item[0], profileId, item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9]);
  }

  for (const item of fileAssets) {
    const size = writeSampleFile(item.storagePath, item.content);
    insertFileAsset.run(
      item.id,
      profileId,
      item.module,
      item.category,
      item.title,
      item.originalName,
      item.storagePath,
      item.mimeType,
      size,
      item.remark
    );
  }
});

seedTransaction();
database.close();

console.log(`已写入开发假数据：${passwordItems.length} 条密码，${fileAssets.length} 个文件资产。`);
