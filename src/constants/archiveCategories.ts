/**
 * 文件说明：档案模块分类常量和归一化工具
 */

export const DOCUMENT_CATEGORY_OPTIONS = ['工作记录', '项目说明', '备忘', '模板'] as const;

export const CERTIFICATE_CATEGORY_OPTIONS = ['身份证明', '学历证书', '职业资格', '入职材料', '合同票据', '其他'] as const;

export const STUDY_CATEGORY_OPTIONS = ['前端', '后端', '数据库', 'AI相关'] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORY_OPTIONS)[number];

export type CertificateCategory = (typeof CERTIFICATE_CATEGORY_OPTIONS)[number];

export type StudyCategory = (typeof STUDY_CATEGORY_OPTIONS)[number];

interface CategoryAliasRule<TCategory extends string> {
  /** 类型：分类名称；含义：归一化后的目标分类；是否必填：是；默认值：无 */
  target: TCategory;
  /** 类型：只读字符串数组；含义：可被归入目标分类的关键词；是否必填：是；默认值：空数组 */
  aliases: readonly string[];
}

const documentCategoryAliasRules: readonly CategoryAliasRule<DocumentCategory>[] = [
  { target: '工作记录', aliases: ['工作', '周报', '日报', '汇报', '会议', '记录'] },
  { target: '项目说明', aliases: ['项目', '说明', '部署', '技术', '接口', '数据库', '开发'] },
  { target: '备忘', aliases: ['备忘', '便签', '待办', '其他', '生活'] },
  { target: '模板', aliases: ['模板', '范本', '格式'] }
];

const certificateCategoryAliasRules: readonly CategoryAliasRule<CertificateCategory>[] = [
  { target: '身份证明', aliases: ['身份证', '护照', '户口', '驾驶证', '居住证', '社保卡', '证明'] },
  { target: '学历证书', aliases: ['学历', '学位', '毕业', '成绩', '四六级', '英语'] },
  { target: '职业资格', aliases: ['资格', '证书', '职称', '执业', '认证', '培训'] },
  { target: '入职材料', aliases: ['入职', '离职', '背调', '体检', '劳动', '员工'] },
  { target: '合同票据', aliases: ['合同', '发票', '收据', '票据', '报销'] }
];

const studyCategoryAliasRules: readonly CategoryAliasRule<StudyCategory>[] = [
  { target: '前端', aliases: ['前端', 'vue', 'nuxt', 'react', 'css', 'scss', 'html', 'javascript', 'typescript'] },
  { target: '后端', aliases: ['后端', 'java', 'node', 'spring', 'api', '服务端'] },
  { target: '数据库', aliases: ['数据库', 'sql', 'sqlite', 'mysql', 'postgres', '索引', '事务'] },
  { target: 'AI相关', aliases: ['AI相关', '人工智能', '大模型', 'llm', 'prompt', '提示词', 'dify'] }
];

/**
 * 判断分类集合是否包含指定分类
 * @param options - 分类集合
 * @param category - 待判断分类
 * @returns 是否包含该分类
 * @throws 不抛出异常
 */
const hasCategory = <TCategory extends string>(options: readonly TCategory[], category: string): category is TCategory => {
  return options.some((option) => option === category);
};

/**
 * 按规则归一化分类
 * @param value - 原始分类
 * @param options - 合法分类集合
 * @param rules - 旧分类别名规则
 * @param fallbackCategory - 无法匹配时的默认分类
 * @returns 归一化后的分类
 * @throws 不抛出异常
 */
const normalizeCategory = <TCategory extends string>(
  value: string | null | undefined,
  options: readonly TCategory[],
  rules: readonly CategoryAliasRule<TCategory>[],
  fallbackCategory: TCategory
): TCategory => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return fallbackCategory;
  }

  if (hasCategory(options, trimmedValue)) {
    return trimmedValue;
  }

  const normalizedValue = trimmedValue.toLocaleLowerCase();
  const matchedRule = rules.find((rule) => {
    return rule.aliases.some((alias) => normalizedValue.includes(alias.toLocaleLowerCase()));
  });

  return matchedRule?.target || fallbackCategory;
};

/**
 * 归一化文档分类
 * @param category - 原始文档分类
 * @returns 文档分类
 * @throws 不抛出异常
 */
export const normalizeDocumentCategory = (category: string | null | undefined): DocumentCategory => {
  return normalizeCategory(category, DOCUMENT_CATEGORY_OPTIONS, documentCategoryAliasRules, '备忘');
};

/**
 * 归一化证件分类
 * @param category - 原始证件分类
 * @returns 证件分类
 * @throws 不抛出异常
 */
export const normalizeCertificateCategory = (category: string | null | undefined): CertificateCategory => {
  return normalizeCategory(category, CERTIFICATE_CATEGORY_OPTIONS, certificateCategoryAliasRules, '其他');
};

/**
 * 归一化学习资料分类
 * @param category - 原始学习资料分类
 * @returns 学习资料分类
 * @throws 不抛出异常
 */
export const normalizeStudyCategory = (category: string | null | undefined): StudyCategory => {
  return normalizeCategory(category, STUDY_CATEGORY_OPTIONS, studyCategoryAliasRules, '前端');
};
