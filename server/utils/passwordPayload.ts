/**
 * 密码记录请求体解析工具
 */

import { normalizePasswordCategory } from '../../src/constants/passwordCategories';
import { normalizePasswordLoginMethod } from '../../src/constants/passwordLoginMethods';

export interface PasswordRequestBody {
  userId?: unknown;
  title?: unknown;
  category?: unknown;
  loginUrl?: unknown;
  loginMethod?: unknown;
  account?: unknown;
  password?: unknown;
  phone?: unknown;
  email?: unknown;
  remark?: unknown;
}

export interface NormalizedPasswordPayload {
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

/**
 * 将未知请求字段转换为字符串
 * @param value - 未知字段值
 * @returns 标准化字符串
 * @throws 不抛出异常
 */
const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * 校验中国大陆手机号，兼容 +86 前缀和常见空格、短横线分隔
 * @param value - 待校验手机号
 * @returns 是否为合法手机号
 * @throws 不抛出异常
 */
const isValidMainlandChinaPhone = (value: string): boolean => {
  const normalized = value.replace(/[\s-]/g, '');
  return /^(?:\+?86)?1[3-9]\d{9}$/.test(normalized);
};

/**
 * 校验常见邮箱格式
 * @param value - 待校验邮箱
 * @returns 是否为合法邮箱
 * @throws 不抛出异常
 */
const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

/**
 * 解析密码记录请求体
 * @param body - 原始请求体
 * @returns 标准化后的密码记录
 * @throws 当必填字段缺失时抛出异常
 */
export const parsePasswordPayload = (body: PasswordRequestBody): NormalizedPasswordPayload => {
  const title = normalizeOptionalText(body.title);
  const account = normalizeOptionalText(body.account);
  const phone = normalizeOptionalText(body.phone);
  const email = normalizeOptionalText(body.email);
  const loginMethod = normalizePasswordLoginMethod(normalizeOptionalText(body.loginMethod), account, email);

  if (!title) {
    throw new Error('平台名称不能为空');
  }

  if (phone && !isValidMainlandChinaPhone(phone)) {
    throw new Error('绑定手机号格式不正确，请输入中国大陆手机号');
  }

  if (email && !isValidEmail(email)) {
    throw new Error('绑定邮箱格式不正确');
  }

  return {
    title,
    category: normalizePasswordCategory(normalizeOptionalText(body.category)),
    loginUrl: normalizeOptionalText(body.loginUrl),
    loginMethod,
    account,
    password: normalizeOptionalText(body.password),
    phone,
    email,
    remark: normalizeOptionalText(body.remark)
  };
};
