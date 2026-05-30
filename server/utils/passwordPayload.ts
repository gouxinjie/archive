/**
 * 密码记录请求体解析工具
 */

import { normalizePasswordCategory } from '../../src/constants/passwordCategories';

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
 * 解析密码记录请求体
 * @param body - 原始请求体
 * @returns 标准化后的密码记录
 * @throws 当必填字段缺失时抛出异常
 */
export const parsePasswordPayload = (body: PasswordRequestBody): NormalizedPasswordPayload => {
  const title = normalizeOptionalText(body.title);

  if (!title) {
    throw new Error('平台名称不能为空');
  }

  return {
    title,
    category: normalizePasswordCategory(normalizeOptionalText(body.category)),
    loginUrl: normalizeOptionalText(body.loginUrl),
    loginMethod: normalizeOptionalText(body.loginMethod),
    account: normalizeOptionalText(body.account),
    password: normalizeOptionalText(body.password),
    phone: normalizeOptionalText(body.phone),
    email: normalizeOptionalText(body.email),
    remark: normalizeOptionalText(body.remark)
  };
};
