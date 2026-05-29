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
import { getSetting, listArchiveProfiles } from './database';

const MASTER_PASSWORD_KEY = 'master_password_hash';
const SESSION_COOKIE_NAME = 'archive_session';
const CSRF_COOKIE_NAME = 'archive_csrf';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

let developmentSessionSecret: string | null = null;

export interface ArchiveSession {
  /** 类型：字符串；含义：当前档案标识；是否必填：是；默认值：无 */
  profileId: string;
  /** 类型：字符串；含义：当前档案名称；是否必填：是；默认值：无 */
  profileName: string;
}

/**
 * 获取当前环境是否为生产环境
 * @returns 是否生产环境
 * @throws 不抛出异常
 */
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

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
  return listArchiveProfiles().length > 0 || Boolean(getSetting(MASTER_PASSWORD_KEY));
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

    if (typeof decoded.profileId === 'string' && typeof decoded.profileName === 'string') {
      return {
        profileId: decoded.profileId,
        profileName: decoded.profileName
      };
    }

    if (typeof decoded.userId === 'string') {
      return {
        profileId: decoded.userId,
        profileName: decoded.userId === 'demo' ? '演示档案' : '个人档案'
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
    secure: isProduction()
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
    secure: isProduction()
  });
};

/**
 * 判断请求是否已经解锁
 * @param event - H3 请求事件
 * @returns 是否已解锁
 * @throws 不抛出异常
 */
export const isAuthenticated = (event: H3Event): boolean => {
  return Boolean(verifySessionToken(getCookie(event, SESSION_COOKIE_NAME)));
};

/**
 * 断言请求已经解锁
 * @param event - H3 请求事件
 * @returns 当前档案会话
 * @throws 当未解锁时抛出异常
 */
export const assertAuthenticated = (event: H3Event): ArchiveSession => {
  const session = verifySessionToken(getCookie(event, SESSION_COOKIE_NAME));

  if (!session) {
    throw new Error('请先输入档案密码');
  }

  return session;
};

/**
 * 按密码匹配档案
 * @param password - 用户输入的档案密码
 * @returns 匹配到的档案会话，未匹配时返回 null
 * @throws 当密码校验失败时抛出异常
 */
export const matchArchiveProfileByPassword = async (password: string): Promise<ArchiveSession | null> => {
  const profiles = listArchiveProfiles();

  for (const profile of profiles) {
    const matched = await verifyPassword(password, profile.password_hash);

    if (matched) {
      return {
        profileId: profile.id,
        profileName: profile.name
      };
    }
  }

  return null;
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
    secure: isProduction()
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
