/**
 * 文件说明：密码模块登录方式常量与归一化工具
 * 样式说明：无样式
 * 关键布局说明：无布局
 */

export interface PasswordLoginMethodOptionGroup {
  /** 类型：string；含义：分组标题；是否必填：是；默认值：无 */
  label: string;
  /** 类型：string[]；含义：分组下的登录方式选项；是否必填：是；默认值：空数组 */
  options: string[];
}

export const PASSWORD_LOGIN_METHOD_OPTION_GROUPS: PasswordLoginMethodOptionGroup[] = [
  {
    label: '常规方式',
    options: ['手机号', 'QQ邮箱', '网易邮箱', '账号密码']
  },
  {
    label: '社交通讯',
    options: ['微信', 'QQ', '企业微信']
  },
  {
    label: '开发账号',
    options: ['GitHub', 'Gitee', '谷歌账号']
  },
  {
    label: '平台账号',
    options: ['Apple ID', 'Microsoft 账号', '支付宝']
  },
  {
    label: '其他方式',
    options: ['扫码登录', '单点登录']
  }
];

const QQ_EMAIL_LOGIN_METHOD = 'QQ邮箱';
const NETEASE_EMAIL_LOGIN_METHOD = '网易邮箱';
const GENERIC_EMAIL_LOGIN_METHOD = '邮箱';
const QQ_EMAIL_DOMAINS = new Set(['qq.com', 'vip.qq.com', 'foxmail.com']);
const NETEASE_EMAIL_DOMAINS = new Set(['163.com', '126.com', 'yeah.net', 'vip.163.com']);

/**
 * 归一化可选文本
 * @param value - 原始文本
 * @returns 去除首尾空格后的文本，空值时返回 null
 * @throws 不抛出异常
 */
const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * 校验是否为邮箱格式
 * @param value - 待校验文本
 * @returns 是否为合法邮箱格式
 * @throws 不抛出异常
 */
const isEmailAddress = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

/**
 * 提取邮箱域名
 * @param value - 邮箱或账号文本
 * @returns 小写域名，无法提取时返回 null
 * @throws 不抛出异常
 */
const getEmailDomain = (value: string | null | undefined): string | null => {
  const normalized = normalizeText(value);

  if (!normalized || !isEmailAddress(normalized)) {
    return null;
  }

  const atIndex = normalized.lastIndexOf('@');
  return normalized.slice(atIndex + 1).toLowerCase();
};

/**
 * 根据邮箱域名推断邮箱登录方式
 * @param account - 登录账号
 * @param email - 绑定邮箱
 * @returns QQ邮箱、网易邮箱或 null
 * @throws 不抛出异常
 */
export const inferEmailLoginMethod = (
  account: string | null | undefined,
  email: string | null | undefined
): string | null => {
  const domains = [getEmailDomain(email), getEmailDomain(account)].filter((domain): domain is string => Boolean(domain));

  for (const domain of domains) {
    if (QQ_EMAIL_DOMAINS.has(domain)) {
      return QQ_EMAIL_LOGIN_METHOD;
    }

    if (NETEASE_EMAIL_DOMAINS.has(domain)) {
      return NETEASE_EMAIL_LOGIN_METHOD;
    }
  }

  return null;
};

/**
 * 归一化登录方式
 * @param loginMethod - 原始登录方式
 * @param account - 登录账号
 * @param email - 绑定邮箱
 * @returns 归一化后的登录方式
 * @throws 当邮箱登录方式不符合约束时抛出异常
 */
export const normalizePasswordLoginMethod = (
  loginMethod: string | null | undefined,
  account: string | null | undefined,
  email: string | null | undefined
): string | null => {
  const normalizedMethod = normalizeText(loginMethod);

  if (!normalizedMethod) {
    return null;
  }

  const inferredEmailLoginMethod = inferEmailLoginMethod(account, email);

  if (normalizedMethod === GENERIC_EMAIL_LOGIN_METHOD) {
    if (inferredEmailLoginMethod) {
      return inferredEmailLoginMethod;
    }

    throw new Error('邮箱登录请明确选择 QQ邮箱 或 网易邮箱');
  }

  if (normalizedMethod === QQ_EMAIL_LOGIN_METHOD || normalizedMethod === NETEASE_EMAIL_LOGIN_METHOD) {
    if (inferredEmailLoginMethod && inferredEmailLoginMethod !== normalizedMethod) {
      throw new Error('登录方式与邮箱域名不一致，请选择正确的邮箱类型');
    }

    return normalizedMethod;
  }

  if (normalizedMethod.includes('邮箱')) {
    throw new Error('邮箱登录方式仅支持 QQ邮箱 或 网易邮箱');
  }

  return normalizedMethod;
};
