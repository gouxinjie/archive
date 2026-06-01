/**
 * 鉴权、CSRF 和密码哈希工具
 */

import bcrypt from 'bcryptjs';
import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';
import {
  getCookie,
  getHeader,
  getQuery,
  setCookie,
  type H3Event
} from 'h3';
import type { ArchiveModuleKey } from '../../src/types/models';
import { countUsers, getSetting, getUserByUsername, listArchiveProfiles } from './database';

const MASTER_PASSWORD_KEY = 'master_password_hash';
const SESSION_COOKIE_NAME = 'archive_session';
const CSRF_COOKIE_NAME = 'archive_csrf';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const FILE_PREVIEW_TTL_SECONDS = 60 * 10;
const FILE_PREVIEW_PURPOSE = 'file-preview';
const ARCHIVE_MODULE_KEYS: ArchiveModuleKey[] = ['passwords', 'documents', 'resumes', 'images', 'certificates', 'study'];

let developmentSessionSecret: string | null = null;

export interface ArchiveSession {
  /** 类型：字符串；含义：当前登录用户标识；是否必填：是；默认值：无 */
  userId: string;
  /** 类型：字符串；含义：当前登录账号；是否必填：是；默认值：无 */
  username: string;
  /** 类型：字符串；含义：当前用户显示名称；是否必填：是；默认值：无 */
  displayName: string;
  /** 类型：字符串；含义：当前档案标识；是否必填：是；默认值：无 */
  profileId: string;
  /** 类型：字符串；含义：当前档案名称；是否必填：是；默认值：无 */
  profileName: string;
}

export interface FilePreviewTokenInput {
  /** 类型：字符串；含义：当前档案标识；是否必填：是；默认值：无 */
  profileId: string;
  /** 类型：ArchiveModuleKey；含义：文件所属模块；是否必填：是；默认值：无 */
  module: ArchiveModuleKey;
  /** 类型：字符串；含义：文件资源标识；是否必填：是；默认值：无 */
  fileId: string;
}

export interface FilePreviewTokenPayload extends FilePreviewTokenInput {
  /** 类型：字符串；含义：令牌用途；是否必填：是；默认值：file-preview */
  purpose: typeof FILE_PREVIEW_PURPOSE;
  /** 类型：数字；含义：过期时间戳（秒）；是否必填：是；默认值：当前时间加有效期 */
  expiresAt: number;
}

/**
 * 获取当前环境是否为生产环境
 * @returns 是否生产环境
 * @throws 不抛出异常
 */
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * 判断当前请求是否应该使用 Secure Cookie
 * @param event - H3 请求事件
 * @returns 是否使用 Secure Cookie
 * @throws 不主动抛出异常
 */
const shouldUseSecureCookie = (event: H3Event): boolean => {
  if (!isProduction()) {
    return false;
  }

  const forwardedProto = getHeader(event, 'x-forwarded-proto');

  if (typeof forwardedProto === 'string' && forwardedProto.length > 0) {
    return forwardedProto.split(',')[0]?.trim().toLowerCase() === 'https';
  }

  const configuredOrigin = process.env.NUXT_PUBLIC_ORIGIN?.trim();

  if (!configuredOrigin) {
    return false;
  }

  try {
    return new URL(configuredOrigin).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 获取会话签名密钥
 * @returns 会话签名密钥
 * @throws 当生产环境未配置 NUXT_SESSION_SECRET 时抛出异常
 */
const getSessionSecret = (): string => {
  const secret = process.env.NUXT_SESSION_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (isProduction()) {
    throw new Error('生产环境缺少 NUXT_SESSION_SECRET 环境变量');
  }

  if (!developmentSessionSecret) {
    developmentSessionSecret = randomBytes(32).toString('hex');
  }

  return developmentSessionSecret;
};

/**
 * 获取文件预览签名密钥
 * @returns 文件预览签名密钥
 * @throws 生产环境缺少会话密钥时抛出异常
 */
const getFilePreviewSecret = (): string => {
  const secret = process.env.NUXT_FILE_PREVIEW_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  return getSessionSecret();
};

/**
 * 判断未知值是否为普通对象
 * @param value - 未知输入值
 * @returns 是否为普通对象
 * @throws 不主动抛出异常
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * 判断未知值是否为有效的文件预览令牌载荷
 * @param value - 未知输入值
 * @returns 是否为有效文件预览令牌载荷
 * @throws 不主动抛出异常
 */
const isFilePreviewTokenPayload = (value: unknown): value is FilePreviewTokenPayload => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.purpose === FILE_PREVIEW_PURPOSE &&
    typeof value.profileId === 'string' &&
    typeof value.fileId === 'string' &&
    typeof value.expiresAt === 'number' &&
    typeof value.module === 'string' &&
    ARCHIVE_MODULE_KEYS.includes(value.module as ArchiveModuleKey)
  );
};

/**
 * 获取单人系统的用户标识
 * @returns 用户标识
 * @throws 不抛出异常
 */
export const getOwnerUserId = (): string => {
  return process.env.NUXT_OWNER_USER_ID || 'owner';
};

/**
 * 从请求值中读取用户标识
 * @param value - 未知请求值
 * @returns 用户标识或 null
 * @throws 不抛出异常
 */
export const normalizeUserId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * 校验请求中的用户标识
 * @param userId - 请求传入的用户标识
 * @returns 校验通过后的用户标识
 * @throws 当用户标识无效时抛出异常
 */
export const assertValidUserId = (userId: unknown): string => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId || normalizedUserId !== getOwnerUserId()) {
    throw new Error('用户标识无效');
  }

  return normalizedUserId;
};

/**
 * 从 GET 查询参数中读取并校验用户标识
 * @param event - H3 请求事件
 * @returns 用户标识
 * @throws 当用户标识无效时抛出异常
 */
export const assertQueryUserId = (event: H3Event): string => {
  const query = getQuery(event);
  return assertValidUserId(query.userId);
};

/**
 * 哈希个人密码
 * @param password - 明文个人密码
 * @returns 哈希后的密码
 * @throws 当哈希失败时抛出异常
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

/**
 * 校验个人密码
 * @param password - 明文个人密码
 * @param hashedPassword - 哈希密码
 * @returns 是否匹配
 * @throws 当校验失败时抛出异常
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 判断是否已经设置个人密码
 * @returns 是否已设置密码
 * @throws 当数据库查询失败时抛出异常
 */
export const hasMasterPassword = (): boolean => {
  return countUsers() > 0 || listArchiveProfiles().length > 0 || Boolean(getSetting(MASTER_PASSWORD_KEY));
};

/**
 * 获取个人密码哈希
 * @returns 密码哈希，未设置时返回 null
 * @throws 当数据库查询失败时抛出异常
 */
export const getMasterPasswordHash = (): string | null => {
  return getSetting(MASTER_PASSWORD_KEY);
};

/**
 * 获取个人密码设置键名
 * @returns 设置键名
 * @throws 不抛出异常
 */
export const getMasterPasswordSettingKey = (): string => MASTER_PASSWORD_KEY;

/**
 * 创建签名会话令牌
 * @param profile - 档案会话
 * @returns 签名后的会话令牌
 * @throws 当签名失败时抛出异常
 */
export const createSessionToken = (profile: ArchiveSession): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...profile, expiresAt })).toString('base64url');
  const signature = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

/**
 * 创建文件在线预览短时令牌
 * @param input - 预览文件定位信息
 * @returns 签名后的短时预览令牌
 * @throws 签名失败时抛出异常
 */
export const createFilePreviewToken = (input: FilePreviewTokenInput): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + FILE_PREVIEW_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...input, purpose: FILE_PREVIEW_PURPOSE, expiresAt })).toString('base64url');
  const signature = createHmac('sha256', getFilePreviewSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

/**
 * 校验文件在线预览短时令牌
 * @param token - 预览令牌
 * @returns 校验通过后的令牌载荷，失败时返回 null
 * @throws 不主动抛出异常
 */
export const verifyFilePreviewToken = (token: string | undefined): FilePreviewTokenPayload | null => {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getFilePreviewSecret()).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    if (!isFilePreviewTokenPayload(decoded)) {
      return null;
    }

    if (decoded.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

/**
 * 校验会话令牌
 * @param token - 会话令牌
 * @returns 档案会话，校验失败时返回 null
 * @throws 不抛出异常
 */
export const verifySessionToken = (token: string | undefined): ArchiveSession | null => {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      userId?: unknown;
      username?: unknown;
      displayName?: unknown;
      profileId?: unknown;
      profileName?: unknown;
      expiresAt?: unknown;
    };

    if (typeof decoded.expiresAt !== 'number') {
      return null;
    }

    if (decoded.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (typeof decoded.userId === 'string' && typeof decoded.username === 'string' && typeof decoded.displayName === 'string') {
      return {
        userId: decoded.userId,
        username: decoded.username,
        displayName: decoded.displayName,
        profileId: typeof decoded.profileId === 'string' ? decoded.profileId : decoded.userId,
        profileName: typeof decoded.profileName === 'string' ? decoded.profileName : decoded.displayName
      };
    }

    if (typeof decoded.profileId === 'string' && typeof decoded.profileName === 'string') {
      return {
        userId: decoded.profileId,
        username: decoded.profileId === 'personal' ? 'xinjie' : decoded.profileId,
        displayName: decoded.profileName,
        profileId: decoded.profileId,
        profileName: decoded.profileName
      };
    }

    if (typeof decoded.userId === 'string') {
      const displayName = decoded.userId === 'demo' ? '演示账号' : '个人档案';

      return {
        userId: decoded.userId,
        username: decoded.userId === 'personal' ? 'xinjie' : decoded.userId,
        displayName,
        profileId: decoded.userId,
        profileName: displayName
      };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 写入会话 Cookie
 * @param event - H3 请求事件
 * @param profile - 档案会话
 * @returns 无返回值
 * @throws 当签名失败时抛出异常
 */
export const setSessionCookie = (event: H3Event, profile: ArchiveSession): void => {
  setCookie(event, SESSION_COOKIE_NAME, createSessionToken(profile), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: shouldUseSecureCookie(event)
  });
};

/**
 * 清理会话 Cookie
 * @param event - H3 请求事件
 * @returns 无返回值
 * @throws 不抛出异常
 */
export const clearSessionCookie = (event: H3Event): void => {
  setCookie(event, SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'strict',
    secure: shouldUseSecureCookie(event)
  });
};

/**
 * 判断请求是否已经登录
 * @param event - H3 请求事件
 * @returns 是否已登录
 * @throws 不抛出异常
 */
export const isAuthenticated = (event: H3Event): boolean => {
  return Boolean(verifySessionToken(getCookie(event, SESSION_COOKIE_NAME)));
};

/**
 * 断言请求已经登录
 * @param event - H3 请求事件
 * @returns 当前档案会话
 * @throws 当未登录时抛出异常
 */
export const assertAuthenticated = (event: H3Event): ArchiveSession => {
  const session = verifySessionToken(getCookie(event, SESSION_COOKIE_NAME));

  if (!session) {
    throw new Error('请先登录账号');
  }

  return session;
};

/**
 * 按账号和密码匹配用户
 * @param username - 登录账号
 * @param password - 登录密码
 * @returns 匹配到的用户会话，未匹配时返回 null
 * @throws 当密码校验失败时抛出异常
 */
export const matchUserByCredentials = async (username: string, password: string): Promise<ArchiveSession | null> => {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return null;
  }

  const user = getUserByUsername(normalizedUsername);

  if (!user || user.status !== 'active') {
    return null;
  }

  const matched = await verifyPassword(password, user.password_hash);

  if (!matched) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    profileId: user.id,
    profileName: user.display_name
  };
};

/**
 * 确保请求存在 CSRF 令牌
 * @param event - H3 请求事件
 * @returns CSRF 令牌
 * @throws 不抛出异常
 */
export const ensureCsrfCookie = (event: H3Event): string => {
  const existingToken = getCookie(event, CSRF_COOKIE_NAME);

  if (existingToken) {
    return existingToken;
  }

  const token = randomBytes(32).toString('base64url');
  setCookie(event, CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: shouldUseSecureCookie(event)
  });

  return token;
};

/**
 * 校验 POST 请求的 CSRF 令牌
 * @param event - H3 请求事件
 * @returns 无返回值
 * @throws 当令牌缺失或不匹配时抛出异常
 */
export const assertCsrfToken = (event: H3Event): void => {
  const cookieToken = getCookie(event, CSRF_COOKIE_NAME);
  const headerToken = getHeader(event, 'x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error('CSRF 令牌无效');
  }
};
