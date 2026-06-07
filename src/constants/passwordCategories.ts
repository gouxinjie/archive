/**
 * 文件说明：密码分类常量
 * 样式说明：无样式
 * 关键布局说明：无布局
 */

/** 密码模块推荐分类，按使用场景组织。 */
export const PASSWORD_CATEGORY_OPTIONS = [
  '云服务',
  '开发平台',
  '办公协作',
  '社交通讯',
  '邮箱账号',
  '银行金融',
  '支付购物',
  '出行生活',
  '游戏娱乐',
  '学习内容',
  '政务生活',
  '个人相关',
  '其他'
] as const;

/** 历史分类到新分类的映射，用于兼容旧数据。 */
export const LEGACY_PASSWORD_CATEGORY_MAP = {
  阿里系: '云服务',
  腾讯系: '社交通讯',
  谷歌系: '邮箱账号',
  社交媒体: '社交通讯'
} as const;

export type PasswordCategory = (typeof PASSWORD_CATEGORY_OPTIONS)[number];
export type LegacyPasswordCategory = keyof typeof LEGACY_PASSWORD_CATEGORY_MAP;

/**
 * 归一化密码分类
 * @param category - 原始分类名称
 * @returns 归一化后的分类名称
 * @throws 不抛出异常
 */
export const normalizePasswordCategory = (category: string | null | undefined): string => {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return '其他';
  }

  if (trimmedCategory in LEGACY_PASSWORD_CATEGORY_MAP) {
    return LEGACY_PASSWORD_CATEGORY_MAP[trimmedCategory as LegacyPasswordCategory];
  }

  return trimmedCategory;
};

/**
 * 获取历史密码分类映射列表
 * @returns 历史分类和新分类的映射列表
 * @throws 不抛出异常
 */
export const getLegacyPasswordCategoryEntries = (): Array<[LegacyPasswordCategory, string]> => {
  return Object.entries(LEGACY_PASSWORD_CATEGORY_MAP) as Array<[LegacyPasswordCategory, string]>;
};
