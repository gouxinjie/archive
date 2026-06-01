<script setup lang="ts">
/**
 * @component ModuleDetailShell
 * @description 个人档案模块工作台布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { computed, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import {
  ArrowRight,
  Close,
  Delete,
  Download,
  EditPen,
  Plus,
  View
} from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElOptionGroup,
  ElSelect,
  type FormInstance,
  type FormRules
} from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import FileDropzone from '~/components/commons/FileDropzone/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
import {
  CERTIFICATE_CATEGORY_OPTIONS,
  DOCUMENT_CATEGORY_OPTIONS,
  STUDY_CATEGORY_OPTIONS,
  normalizeCertificateCategory,
  normalizeDocumentCategory,
  normalizeStudyCategory
} from '~/constants/archiveCategories';
import { PASSWORD_CATEGORY_OPTIONS } from '~/constants/passwordCategories';
import type { DashboardSummaryData, ResumePreviewData } from '~/types/api';
import type {
  ArchiveModuleConfig,
  ArchiveModuleKey,
  DocumentDetailData,
  DocumentFileType,
  DocumentFormPayload,
  DocumentListItem,
  FileAssetFormPayload,
  FileAssetListItem,
  ImageFormPayload,
  PasswordFormPayload,
  PasswordListItem,
  ResumeFileType,
  ResumeFormPayload
} from '~/types/models';
import { getArchiveUserId, request } from '~/utils/request';

type UserMenuCommand = 'logout';

interface ModuleDetailShellProps {
  /** 类型：ArchiveModuleConfig；含义：当前模块配置；是否必填：是；默认值：无 */
  module: ArchiveModuleConfig;
  /** 类型：DashboardSummaryData；含义：模块统计；是否必填：是；默认值：无 */
  summary: DashboardSummaryData;
  /** 类型：PasswordListItem[] 或 FileAssetListItem[]；含义：模块列表；是否必填：是；默认值：空数组 */
  items: PasswordListItem[] | DocumentListItem[] | FileAssetListItem[];
  /** 类型：布尔值；含义：模块数据是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：模块加载错误提示；是否必填：否；默认值：空字符串 */
  errorMessage?: string;
  /** 类型：字符串；含义：当前用户展示名称；是否必填：否；默认值：空字符串 */
  userName?: string;
  /** 类型：布尔值；含义：密码增删改操作是否执行中；是否必填：否；默认值：false */
  passwordOperationLoading?: boolean;
  /** 类型：字符串；含义：密码弹窗内操作错误提示；是否必填：否；默认值：空字符串 */
  passwordOperationError?: string;
  /** 类型：数字；含义：密码保存成功信号；是否必填：否；默认值：0 */
  passwordSuccessVersion?: number;
  /** 类型：数字；含义：密码删除成功信号；是否必填：否；默认值：0 */
  passwordDeleteSuccessVersion?: number;
  /** 类型：布尔值；含义：文档增删改操作是否执行中；是否必填：否；默认值：false */
  documentOperationLoading?: boolean;
  /** 类型：字符串；含义：文档抽屉内操作错误提示；是否必填：否；默认值：空字符串 */
  documentOperationError?: string;
  /** 类型：数字；含义：文档保存成功信号；是否必填：否；默认值：0 */
  documentSuccessVersion?: number;
  /** 类型：数字；含义：文档删除成功信号；是否必填：否；默认值：0 */
  documentDeleteSuccessVersion?: number;
  /** 类型：布尔值；含义：简历上传删除操作是否执行中；是否必填：否；默认值：false */
  resumeOperationLoading?: boolean;
  /** 类型：字符串；含义：简历弹窗内操作错误提示；是否必填：否；默认值：空字符串 */
  resumeOperationError?: string;
  /** 类型：数字；含义：简历上传成功信号；是否必填：否；默认值：0 */
  resumeSuccessVersion?: number;
  /** 类型：数字；含义：简历删除成功信号；是否必填：否；默认值：0 */
  resumeDeleteSuccessVersion?: number;
  /** 类型：布尔值；含义：图片上传、编辑或删除操作是否执行中；是否必填：否；默认值：false */
  imageOperationLoading?: boolean;
  /** 类型：字符串；含义：图片弹窗内操作错误提示；是否必填：否；默认值：空字符串 */
  imageOperationError?: string;
  /** 类型：数字；含义：图片保存成功信号；是否必填：否；默认值：0 */
  imageSuccessVersion?: number;
  /** 类型：数字；含义：图片删除成功信号；是否必填：否；默认值：0 */
  imageDeleteSuccessVersion?: number;
  /** 类型：布尔值；含义：证件和学习资料文件操作是否执行中；是否必填：否；默认值：false */
  fileOperationLoading?: boolean;
  /** 类型：字符串；含义：证件和学习资料文件弹窗内操作错误提示；是否必填：否；默认值：空字符串 */
  fileOperationError?: string;
  /** 类型：数字；含义：证件和学习资料文件保存成功信号；是否必填：否；默认值：0 */
  fileSuccessVersion?: number;
  /** 类型：数字；含义：证件和学习资料文件删除成功信号；是否必填：否；默认值：0 */
  fileDeleteSuccessVersion?: number;
}

interface CategoryGroup<T> {
  /** 类型：字符串；含义：分类名称；是否必填：是；默认值：未分类 */
  name: string;
  /** 类型：泛型数组；含义：当前分类下的记录；是否必填：是；默认值：空数组 */
  items: T[];
}

interface LoginMethodOptionGroup {
  /** 类型：字符串；含义：登录方式分组名称；是否必填：是；默认值：无 */
  label: string;
  /** 类型：字符串数组；含义：当前分组下的登录方式选项；是否必填：是；默认值：空数组 */
  options: string[];
}

type DocumentEditorMode = 'write' | 'preview';
type PreviewImageSource = 'images' | 'files';

interface ResumeFormState {
  /** 类型：字符串或 undefined；含义：简历记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：简历标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：简历分类；是否必填：否；默认值：通用 */
  category: string;
  /** 类型：字符串；含义：上传文件原始名称；是否必填：否；默认值：空字符串 */
  originalName: string;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

interface ImageFormState {
  /** 类型：字符串或 undefined；含义：图片记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：图片标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：图片分类；是否必填：是；默认值：其他 */
  category: string;
  /** 类型：字符串；含义：当前图片原始文件名；是否必填：否；默认值：空字符串 */
  originalName: string;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

interface GenericFileFormState {
  /** 类型：字符串或 undefined；含义：文件记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：文件标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：文件分类；是否必填：是；默认值：其他 */
  category: string;
  /** 类型：字符串；含义：当前文件原始名称；是否必填：否；默认值：空字符串 */
  originalName: string;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

const props = withDefaults(defineProps<ModuleDetailShellProps>(), {
  errorMessage: '',
  userName: '',
  passwordOperationLoading: false,
  passwordOperationError: '',
  passwordSuccessVersion: 0,
  passwordDeleteSuccessVersion: 0,
  documentOperationLoading: false,
  documentOperationError: '',
  documentSuccessVersion: 0,
  documentDeleteSuccessVersion: 0,
  resumeOperationLoading: false,
  resumeOperationError: '',
  resumeSuccessVersion: 0,
  resumeDeleteSuccessVersion: 0,
  imageOperationLoading: false,
  imageOperationError: '',
  imageSuccessVersion: 0,
  imageDeleteSuccessVersion: 0,
  fileOperationLoading: false,
  fileOperationError: '',
  fileSuccessVersion: 0,
  fileDeleteSuccessVersion: 0
});

const allCategoryLabel = '全部';
const imageModuleCategoryOptions = ['证件照', '自拍照', '生活照', '旅行照', '工作照', '截图', '其他'] as const;

interface CategoryAliasRule {
  /** 类型：字符串；含义：归一化后的分类名称；是否必填：是；默认值：无 */
  target: string;
  /** 类型：只读字符串数组；含义：可被归入目标分类的关键词；是否必填：是；默认值：空数组 */
  aliases: readonly string[];
}

const imageCategoryAliasRules: readonly CategoryAliasRule[] = [
  { target: '证件照', aliases: ['证件', '头像', '蓝底', '白底', '红底'] },
  { target: '自拍照', aliases: ['自拍', '人像', '个人照'] },
  { target: '生活照', aliases: ['生活', '日常', '家庭', '聚会'] },
  { target: '旅行照', aliases: ['旅行', '旅游', '风景', '出游'] },
  { target: '工作照', aliases: ['工作', '办公', '会议', '项目'] },
  { target: '截图', aliases: ['截图', '截屏', '屏幕'] }
];

const emit = defineEmits<{
  lock: [];
  backHome: [];
  openModule: [moduleKey: ArchiveModuleKey];
  search: [keyword: string];
  savePassword: [payload: PasswordFormPayload];
  deletePassword: [id: string];
  saveDocument: [payload: DocumentFormPayload];
  deleteDocument: [id: string];
  saveResume: [payload: ResumeFormPayload];
  deleteResume: [id: string];
  saveImage: [payload: ImageFormPayload];
  deleteImage: [id: string];
  saveFile: [payload: FileAssetFormPayload];
  deleteFile: [payload: { module: ArchiveModuleKey; id: string }];
}>();

const keyword = ref('');
const activeCategory = ref(allCategoryLabel);
const passwordDialogVisible = ref(false);
const passwordDialogMode = ref<'create' | 'edit' | 'view'>('create');
const passwordFormError = ref('');
const passwordSubmitAttempted = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = ref<PasswordFormPayload>({
  title: '',
  category: '其他',
  loginUrl: '',
  loginMethod: '',
  account: '',
  password: '',
  phone: '',
  email: '',
  remark: ''
});
const passwordCategoryOptions = [...PASSWORD_CATEGORY_OPTIONS];
const loginMethodOptionGroups: LoginMethodOptionGroup[] = [
  {
    label: '常规方式',
    options: ['手机号', '邮箱', '账号密码']
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
const passwordFormRules: FormRules<PasswordFormPayload> = {
  title: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};

const documentDialogVisible = ref(false);
const documentDialogMode = ref<'create' | 'edit' | 'view'>('create');
const documentEditorMode = ref<DocumentEditorMode>('write');
const documentFormError = ref('');
const documentSubmitAttempted = ref(false);
const documentContentLoading = ref(false);
const documentFormRef = ref<FormInstance>();
const documentForm = ref<DocumentFormPayload>({
  title: '',
  category: '备忘',
  fileType: 'md',
  originalName: '',
  content: '',
  remark: ''
});
const documentFileTypeOptions: Array<{ label: string; value: DocumentFileType }> = [
  { label: 'Markdown', value: 'md' },
  { label: 'TXT', value: 'txt' }
];
const documentUploadAccept = '.md,.markdown,.txt,text/markdown,text/plain';
const maxDocumentUploadBytes = 1024 * 1024;
const documentFormRules: FormRules<DocumentFormPayload> = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择文档分类', trigger: 'change' }],
  fileType: [{ required: true, message: '请选择文档类型', trigger: 'change' }]
};
const resumeDialogVisible = ref(false);
const resumeDialogMode = ref<'create' | 'edit'>('create');
const resumeFormError = ref('');
const resumeSubmitAttempted = ref(false);
const resumeFormRef = ref<FormInstance>();
const selectedResumeFile = ref<File | null>(null);
const resumePreviewingId = ref('');
const resumeForm = ref<ResumeFormState>({
  title: '',
  category: '通用',
  originalName: '',
  remark: ''
});
const resumeCategoryOptions = ['Java 后端', '前端开发', '全栈开发', '英文简历', '通用', '其他'];
const resumeUploadAccept = '.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const maxResumeUploadBytes = 20 * 1024 * 1024;
const resumeFormRules: FormRules<ResumeFormState> = {
  title: [{ required: true, message: '请输入简历标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};
const imageDialogVisible = ref(false);
const imagePreviewDialogVisible = ref(false);
const imageDialogMode = ref<'create' | 'edit'>('create');
const imageFormError = ref('');
const imageSubmitAttempted = ref(false);
const imageFormRef = ref<FormInstance>();
const selectedImageFile = ref<File | null>(null);
const previewImageItem = ref<FileAssetListItem | null>(null);
const previewImageSource = ref<PreviewImageSource>('images');
const imageForm = ref<ImageFormState>({
  title: '',
  category: '证件照',
  originalName: '',
  remark: ''
});
const imageCategoryOptions = [...imageModuleCategoryOptions];
const imageUploadAccept = '.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif';
const maxImageUploadBytes = 15 * 1024 * 1024;
const imageFormRules: FormRules<ImageFormState> = {
  title: [{ required: true, message: '请输入图片标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};
const fileDialogVisible = ref(false);
const fileDialogMode = ref<'create' | 'edit'>('create');
const fileFormError = ref('');
const fileSubmitAttempted = ref(false);
const fileFormRef = ref<FormInstance>();
const selectedGenericFile = ref<File | null>(null);
const fileForm = ref<GenericFileFormState>({
  title: '',
  category: '其他',
  originalName: '',
  remark: ''
});
const genericFileUploadAccept = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.md',
  '.txt',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain'
].join(',');
const maxGenericFileUploadBytes = 25 * 1024 * 1024;
const fileFormRules: FormRules<GenericFileFormState> = {
  title: [{ required: true, message: '请输入文件标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};

const moduleCounts = computed<Record<ArchiveModuleKey, number>>(() => ({
  passwords: props.summary.passwordCount,
  documents: props.summary.documentCount,
  resumes: props.summary.resumeCount,
  images: props.summary.imageCount,
  certificates: props.summary.certificateCount,
  study: props.summary.studyCount
}));

const isPasswordModule = computed<boolean>(() => props.module.key === 'passwords');
const isDocumentModule = computed<boolean>(() => props.module.key === 'documents');
const isResumeModule = computed<boolean>(() => props.module.key === 'resumes');
const isImageModule = computed<boolean>(() => props.module.key === 'images');
const isCertificateModule = computed<boolean>(() => props.module.key === 'certificates');
const isStudyModule = computed<boolean>(() => props.module.key === 'study');
const isEditableFileModule = computed<boolean>(() => isCertificateModule.value || isStudyModule.value);
const isPasswordDialogReadonly = computed<boolean>(() => passwordDialogMode.value === 'view');
const isDocumentDialogReadonly = computed<boolean>(() => documentDialogMode.value === 'view');
const passwordDialogTitle = computed<string>(() => {
  if (passwordDialogMode.value === 'create') {
    return '新增密码';
  }

  if (passwordDialogMode.value === 'edit') {
    return '编辑密码';
  }

  return '查看密码';
});
const passwordDialogErrorMessage = computed<string>(() => {
  if (passwordFormError.value) {
    return passwordFormError.value;
  }

  return passwordSubmitAttempted.value ? props.passwordOperationError : '';
});
const documentDialogTitle = computed<string>(() => {
  if (documentDialogMode.value === 'create') {
    return '新增文档';
  }

  if (documentDialogMode.value === 'edit') {
    return '编辑文档';
  }

  return '查看文档';
});
const documentDialogErrorMessage = computed<string>(() => {
  if (documentFormError.value) {
    return documentFormError.value;
  }

  return documentSubmitAttempted.value ? props.documentOperationError : '';
});
const resumeDialogErrorMessage = computed<string>(() => {
  if (resumeFormError.value) {
    return resumeFormError.value;
  }

  return resumeSubmitAttempted.value ? props.resumeOperationError : '';
});
const resumeDialogTitle = computed<string>(() => {
  return resumeDialogMode.value === 'create' ? '上传简历' : '编辑简历';
});
const imageDialogTitle = computed<string>(() => {
  return imageDialogMode.value === 'create' ? '上传图片' : '编辑图片';
});
const imageDialogErrorMessage = computed<string>(() => {
  if (imageFormError.value) {
    return imageFormError.value;
  }

  return imageSubmitAttempted.value ? props.imageOperationError : '';
});
const fileDialogTitle = computed<string>(() => {
  const moduleName = isStudyModule.value ? '资料' : '证件';
  return fileDialogMode.value === 'create' ? `上传${moduleName}` : `编辑${moduleName}`;
});
const fileDialogErrorMessage = computed<string>(() => {
  if (fileFormError.value) {
    return fileFormError.value;
  }

  return fileSubmitAttempted.value ? props.fileOperationError : '';
});
const fileCategoryOptions = computed<string[]>(() => {
  if (isStudyModule.value) {
    return [...STUDY_CATEGORY_OPTIONS];
  }

  return [...CERTIFICATE_CATEGORY_OPTIONS];
});
const defaultFileCategory = computed<string>(() => {
  if (activeCategory.value !== allCategoryLabel) {
    return activeCategory.value;
  }

  return isStudyModule.value ? '前端' : '其他';
});

const userAvatarText = computed<string>(() => {
  return props.userName.trim().slice(0, 1).toUpperCase() || 'A';
});

const passwordItems = computed<PasswordListItem[]>(() => {
  if (!isPasswordModule.value) {
    return [];
  }

  return props.items as PasswordListItem[];
});

const documentItems = computed<DocumentListItem[]>(() => {
  if (!isDocumentModule.value) {
    return [];
  }

  return props.items as DocumentListItem[];
});

const fileItems = computed<FileAssetListItem[]>(() => {
  if (isPasswordModule.value || isDocumentModule.value || isResumeModule.value || isImageModule.value) {
    return [];
  }

  return props.items as FileAssetListItem[];
});

const resumeItems = computed<FileAssetListItem[]>(() => {
  if (!isResumeModule.value) {
    return [];
  }

  return props.items as FileAssetListItem[];
});

const imageItems = computed<FileAssetListItem[]>(() => {
  if (!isImageModule.value) {
    return [];
  }

  return props.items as FileAssetListItem[];
});

/**
 * 按分类生成分组列表
 * @param items - 需要分组的记录
 * @param getCategory - 获取分类名称的方法
 * @returns 按首次出现顺序排列的分类分组
 * @throws 不抛出异常
 */
const createCategoryGroups = <T>(items: T[], getCategory: (item: T) => string | null | undefined): CategoryGroup<T>[] => {
  const groupMap = new Map<string, T[]>();

  items.forEach((item) => {
    const categoryName = getCategory(item)?.trim() || '未分类';
    const groupItems = groupMap.get(categoryName) || [];
    groupItems.push(item);
    groupMap.set(categoryName, groupItems);
  });

  return Array.from(groupMap.entries()).map(([name, groupedItems]) => ({
    name,
    items: groupedItems
  }));
};

/**
 * 按预设规则归一化分类名称
 * @param category - 原始分类名称
 * @param options - 当前模块允许展示的分类集合
 * @param rules - 旧分类关键词映射规则
 * @returns 归一化后的分类名称
 * @throws 不抛出异常
 */
const normalizeCategoryByRules = (
  category: string | null | undefined,
  options: readonly string[],
  rules: readonly CategoryAliasRule[],
  fallbackCategory = options.includes('其他') ? '其他' : '未分类'
): string => {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return fallbackCategory;
  }

  const exactCategory = options.find((option) => option === trimmedCategory);

  if (exactCategory) {
    return exactCategory;
  }

  const normalizedCategory = trimmedCategory.toLocaleLowerCase();
  const matchedRule = rules.find((rule) => {
    return rule.aliases.some((alias) => normalizedCategory.includes(alias.toLocaleLowerCase()));
  });

  if (!matchedRule || !options.includes(matchedRule.target)) {
    return fallbackCategory;
  }

  return matchedRule.target;
};

/**
 * 按固定分类顺序整理已有分组
 * @param groups - 已生成的分类分组
 * @param options - 当前模块固定分类顺序
 * @returns 排序后的分类分组
 * @throws 不抛出异常
 */
const sortGroupsByCategoryOptions = <T>(groups: CategoryGroup<T>[], options: readonly string[]): CategoryGroup<T>[] => {
  const categoryOrderMap = new Map<string, number>();

  options.forEach((option, index) => {
    categoryOrderMap.set(option, index);
  });

  return [...groups].sort((currentGroup, nextGroup) => {
    const currentOrder = categoryOrderMap.get(currentGroup.name) ?? Number.MAX_SAFE_INTEGER;
    const nextOrder = categoryOrderMap.get(nextGroup.name) ?? Number.MAX_SAFE_INTEGER;

    return currentOrder - nextOrder;
  });
};

/**
 * 获取图片模块展示分类
 * @param category - 图片原始分类
 * @returns 图片模块归一化分类
 * @throws 不抛出异常
 */
const normalizeImageCategory = (category: string | null | undefined): string => {
  return normalizeCategoryByRules(category, imageModuleCategoryOptions, imageCategoryAliasRules);
};

const passwordGroups = computed<CategoryGroup<PasswordListItem>[]>(() => {
  return createCategoryGroups(passwordItems.value, (item) => item.category);
});

const documentGroups = computed<CategoryGroup<DocumentListItem>[]>(() => {
  return sortGroupsByCategoryOptions(
    createCategoryGroups(documentItems.value, (item) => normalizeDocumentCategory(item.category)),
    DOCUMENT_CATEGORY_OPTIONS
  );
});

const resumeGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return createCategoryGroups(resumeItems.value, (item) => item.category);
});

const imageGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return sortGroupsByCategoryOptions(
    createCategoryGroups(imageItems.value, (item) => normalizeImageCategory(item.category)),
    imageModuleCategoryOptions
  );
});

const fileGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  if (isCertificateModule.value) {
    return sortGroupsByCategoryOptions(
      createCategoryGroups(fileItems.value, (item) => normalizeCertificateCategory(item.category)),
      CERTIFICATE_CATEGORY_OPTIONS
    );
  }

  if (isStudyModule.value) {
    return sortGroupsByCategoryOptions(
      createCategoryGroups(fileItems.value, (item) => normalizeStudyCategory(item.category)),
      STUDY_CATEGORY_OPTIONS
    );
  }

  return createCategoryGroups(fileItems.value, (item) => item.category);
});

/**
 * 按当前快捷分类筛选分组
 * @param groups - 当前模块的分类分组
 * @returns 需要展示的分类分组
 * @throws 不抛出异常
 */
const filterGroupsByActiveCategory = <T>(groups: CategoryGroup<T>[]): CategoryGroup<T>[] => {
  if (activeCategory.value === allCategoryLabel) {
    return groups;
  }

  return groups.filter((group) => group.name === activeCategory.value);
};

const categoryTabs = computed<string[]>(() => {
  const categoryNames = (() => {
    if (isPasswordModule.value) {
      return passwordGroups.value.map((group) => group.name);
    }

    if (isDocumentModule.value) {
      return [...DOCUMENT_CATEGORY_OPTIONS];
    }

    if (isResumeModule.value) {
      return resumeGroups.value.map((group) => group.name);
    }

    if (isImageModule.value) {
      return [...imageModuleCategoryOptions];
    }

    if (isCertificateModule.value) {
      return [...CERTIFICATE_CATEGORY_OPTIONS];
    }

    if (isStudyModule.value) {
      return [...STUDY_CATEGORY_OPTIONS];
    }

    return fileGroups.value.map((group) => group.name);
  })();

  return [allCategoryLabel, ...categoryNames];
});

const visiblePasswordGroups = computed<CategoryGroup<PasswordListItem>[]>(() => {
  return filterGroupsByActiveCategory(passwordGroups.value);
});

const visibleDocumentGroups = computed<CategoryGroup<DocumentListItem>[]>(() => {
  return filterGroupsByActiveCategory(documentGroups.value);
});

const visibleResumeGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return filterGroupsByActiveCategory(resumeGroups.value);
});

const visibleImageGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return filterGroupsByActiveCategory(imageGroups.value);
});

const visibleFileGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return filterGroupsByActiveCategory(fileGroups.value);
});

const visibleCategoryGroupCount = computed<number>(() => {
  if (isPasswordModule.value) {
    return visiblePasswordGroups.value.length;
  }

  if (isDocumentModule.value) {
    return visibleDocumentGroups.value.length;
  }

  if (isResumeModule.value) {
    return visibleResumeGroups.value.length;
  }

  if (isImageModule.value) {
    return visibleImageGroups.value.length;
  }

  return visibleFileGroups.value.length;
});

const categoryContentTransitionKey = computed<string>(() => {
  const stateKey = props.errorMessage || (props.loading && props.items.length === 0 ? 'loading' : 'ready');
  return `${props.module.key}-${activeCategory.value}-${stateKey}-${props.items.length}-${visibleCategoryGroupCount.value}`;
});

const moduleContentTransitionKey = computed<string>(() => props.module.key);

/**
 * 格式化文件大小
 * @param size - 文件字节数
 * @returns 可读文件大小
 * @throws 不抛出异常
 */
const formatSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * 创建 Markdown 渲染器
 * @returns 禁用原生 HTML 的 Markdown 渲染实例
 * @throws 不抛出异常
 */
const createMarkdownRenderer = (): MarkdownIt => {
  const renderer = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
    langPrefix: 'language-'
  });

  renderer.validateLink = (url: string): boolean => {
    const trimmedUrl = url.trim();
    return /^(https?:|mailto:|tel:|#|\/)/i.test(trimmedUrl);
  };

  renderer.renderer.rules.link_open = (tokens, index, options, _env, self) => {
    const token = tokens[index];

    token?.attrSet('target', '_blank');
    token?.attrSet('rel', 'noreferrer');

    return self.renderToken(tokens, index, options);
  };

  renderer.renderer.rules.image = (tokens, index, options, _env, self) => {
    const token = tokens[index];

    token?.attrSet('loading', 'lazy');
    token?.attrSet('decoding', 'async');

    return self.renderToken(tokens, index, options);
  };

  return renderer;
};

const markdownRenderer = createMarkdownRenderer();

/**
 * 补齐 GitHub 风格任务列表的勾选框渲染
 * @param html - Markdown 渲染后的安全 HTML
 * @returns 增强任务列表后的 HTML
 * @throws 不抛出异常
 */
const normalizeTaskListHtml = (html: string): string => {
  return html.replace(/<li>(\s*<p>)?\[( |x|X)\]\s+/g, (_match: string, paragraphStart: string, checkedMark: string) => {
    const checkedAttribute = checkedMark.trim() ? ' checked' : '';
    const checkboxHtml = `<input class="module-detail__markdown-task-checkbox" type="checkbox" disabled${checkedAttribute}> `;

    return `<li class="module-detail__markdown-task-item">${paragraphStart || ''}${checkboxHtml}`;
  });
};

/**
 * 渲染 Markdown 预览 HTML
 * @param content - Markdown 源文本
 * @returns 禁用原生 HTML 后生成的安全预览 HTML
 * @throws 不抛出异常
 */
const renderMarkdownPreviewHtml = (content: string): string => {
  return normalizeTaskListHtml(markdownRenderer.render(content));
};

const isDocumentMarkdown = computed<boolean>(() => documentForm.value.fileType === 'md');

const documentContentPlaceholder = computed<string>(() => {
  if (documentContentLoading.value) {
    return '正在加载文档内容...';
  }

  return isDocumentMarkdown.value ? '使用 Markdown 编写内容，右上角可切换预览' : '输入 TXT 文本文档内容';
});

const documentMarkdownPreviewHtml = computed<string>(() => {
  return renderMarkdownPreviewHtml(documentForm.value.content);
});

const hasDocumentMarkdownContent = computed<boolean>(() => {
  return documentForm.value.content.trim().length > 0;
});

/**
 * 生成密码记录的平台头像文本
 * @param title - 平台名称
 * @returns 头像首字符
 * @throws 不抛出异常
 */
const getPasswordAvatarText = (title: string): string => {
  return title.trim().slice(0, 1).toUpperCase() || 'A';
};

/**
 * 生成密码列表的辅助说明
 * @param item - 密码记录
 * @returns 登录方式、账号和备注组成的说明文本
 * @throws 不抛出异常
 */
const getPasswordSummaryText = (item: PasswordListItem): string => {
  const accountText = item.account || getBindingText(item);
  const values = [item.loginMethod, accountText === '-' ? '' : accountText, item.remark].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(' · ') : '未补充账号信息';
};

/**
 * 获取密码记录的账号数量文案
 * @param item - 密码记录
 * @returns 账号数量说明
 * @throws 不抛出异常
 */
const getPasswordAccountCountText = (item: PasswordListItem): string => {
  return item.account || item.phone || item.email ? '1 个账号' : '未填账号';
};

/**
 * 获取简历文件扩展名
 * @param item - 简历文件记录
 * @returns 大写扩展名
 * @throws 不抛出异常
 */
const getResumeExtensionText = (item: FileAssetListItem): string => {
  const extension = item.originalName.split('.').pop()?.trim();
  return extension ? extension.toUpperCase() : 'CV';
};

/**
 * 获取图片文件扩展名
 * @param item - 图片文件记录
 * @returns 大写扩展名
 * @throws 不抛出异常
 */
const getImageExtensionText = (item: FileAssetListItem): string => {
  const extension = item.originalName.split('.').pop()?.trim();
  return extension ? extension.toUpperCase() : 'IMG';
};

/**
 * 判断文件是否为可预览图片
 * @param item - 文件记录
 * @returns 是否为图片 MIME 类型
 * @throws 不抛出异常
 */
const isImagePreviewable = (item: FileAssetListItem): boolean => {
  return item.mimeType.startsWith('image/');
};

/**
 * 生成文件读取地址
 * @param item - 文件记录
 * @param download - 是否下载
 * @returns 带 userId 的文件接口地址
 * @throws 不抛出异常
 */
const buildStoredFileUrl = (item: FileAssetListItem, download = false): string => {
  const query = new URLSearchParams({
    userId: getArchiveUserId()
  });

  if (download) {
    query.set('download', '1');
  }

  if (item.module === 'images') {
    return `/api/images/${encodeURIComponent(item.id)}?${query.toString()}`;
  }

  return `/api/files/${encodeURIComponent(item.module)}/${encodeURIComponent(item.id)}?${query.toString()}`;
};

/**
 * 生成文档下载地址
 * @param id - 文档记录标识
 * @returns 带 userId 的文档下载接口地址
 * @throws 不抛出异常
 */
const buildDocumentDownloadUrl = (id: string): string => {
  const query = new URLSearchParams({
    userId: getArchiveUserId()
  });

  return `/api/documents/${encodeURIComponent(id)}/download?${query.toString()}`;
};

/**
 * 生成图片读取地址
 * @param item - 图片文件记录
 * @param download - 是否下载
 * @returns 带 userId 的图片接口地址
 * @throws 不抛出异常
 */
const buildImageFileUrl = (item: FileAssetListItem, download = false): string => {
  return buildStoredFileUrl(item, download);
};

/**
 * 触发浏览器下载文件
 * @param url - 文件下载地址
 * @param fileName - 下载文件名
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const triggerFileDownload = (url: string, fileName: string): void => {
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noreferrer';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * 下载文档文件
 * @param item - 文档记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const downloadDocument = (item: DocumentListItem): void => {
  triggerFileDownload(buildDocumentDownloadUrl(item.id), item.originalName);
};

/**
 * 下载当前查看中的文档文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const downloadCurrentDocument = (): void => {
  if (!documentForm.value.id) {
    return;
  }

  const fileName = documentForm.value.originalName.trim()
    || normalizeDocumentFileName(documentForm.value.title, documentForm.value.fileType);

  triggerFileDownload(buildDocumentDownloadUrl(documentForm.value.id), fileName);
};

const handleSearch = (): void => {
  emit('search', keyword.value);
};

/**
 * 切换当前模块的快捷分类
 * @param category - 目标分类名称
 * @returns 无返回值
 * @throws 不抛出异常
 */
const selectCategoryTab = (category: string): void => {
  activeCategory.value = category;
};

/**
 * 处理用户菜单命令
 * @param command - 用户菜单命令
 * @returns 无返回值
 * @throws 不抛出异常
 */
const handleUserMenuCommand = (command: UserMenuCommand): void => {
  if (command === 'logout') {
    emit('lock');
  }
};

const openCreatePasswordDrawer = (): void => {
  passwordDialogMode.value = 'create';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  passwordForm.value = {
    title: '',
    category: '其他',
    loginUrl: '',
    loginMethod: '',
    account: '',
    password: '',
    phone: '',
    email: '',
    remark: ''
  };
  passwordDialogVisible.value = true;
};

const fillPasswordForm = (item: PasswordListItem): void => {
  passwordForm.value = {
    id: item.id,
    title: item.title,
    category: item.category,
    loginUrl: item.loginUrl || '',
    loginMethod: item.loginMethod || '',
    account: item.account || '',
    password: item.password || '',
    phone: item.phone || '',
    email: item.email || '',
    remark: item.remark || ''
  };
};

const openViewPasswordDrawer = (item: PasswordListItem): void => {
  passwordDialogMode.value = 'view';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  fillPasswordForm(item);
  passwordDialogVisible.value = true;
};

const switchPasswordDialogToEdit = (): void => {
  passwordDialogMode.value = 'edit';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
};

const closePasswordDrawer = (): void => {
  passwordDialogVisible.value = false;
  passwordSubmitAttempted.value = false;
};

const submitPasswordForm = async (): Promise<void> => {
  if (isPasswordDialogReadonly.value || props.passwordOperationLoading) {
    return;
  }

  if (!passwordFormRef.value) {
    return;
  }

  const valid = await passwordFormRef.value.validate();

  if (!valid) {
    return;
  }

  passwordFormError.value = '';
  passwordSubmitAttempted.value = true;
  emit('savePassword', { ...passwordForm.value });
};

const requestDeletePassword = (id: string): void => {
  if (!props.passwordOperationLoading) {
    emit('deletePassword', id);
  }
};

/**
 * 弹窗确认删除密码记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeletePassword = async (): Promise<void> => {
  if (!passwordForm.value.id || props.passwordOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除这条密码记录？', '删除密码', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    requestDeletePassword(passwordForm.value.id);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

const getBindingText = (item: PasswordListItem): string => {
  const values = [item.phone, item.email].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(' / ') : '-';
};

const normalizeDocumentFileName = (title: string, fileType: DocumentFileType): string => {
  const safeTitle = title.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
  return `${safeTitle || 'document'}.${fileType}`;
};

/**
 * 根据上传文件推断文档类型
 * @param file - 用户选择的本地文件
 * @returns 支持的文档类型，不支持时返回 null
 * @throws 不抛出异常
 */
const getUploadedDocumentFileType = (file: File): DocumentFileType | null => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || file.type === 'text/markdown') {
    return 'md';
  }

  if (fileName.endsWith('.txt') || file.type === 'text/plain') {
    return 'txt';
  }

  return null;
};

/**
 * 根据上传文件名生成文档标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的文档标题
 * @throws 不抛出异常
 */
const normalizeUploadedDocumentTitle = (fileName: string): string => {
  const title = fileName.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名文档';
};

/**
 * 规范化上传文档的原始文件名
 * @param fileName - 原始文件名
 * @param fileType - 文档类型
 * @returns 与当前文档类型一致的文件名
 * @throws 不抛出异常
 */
const normalizeUploadedDocumentName = (fileName: string, fileType: DocumentFileType): string => {
  const fileNameWithoutExtension = fileName.replace(/\.(md|markdown|txt)$/i, '').trim();
  return `${fileNameWithoutExtension || 'document'}.${fileType}`;
};

/**
 * 读取上传的 md/txt 文档并填充到表单
 * @param file - 用户选择的本地文件
 * @returns 无返回值
 * @throws 文件读取失败时写入表单错误
 */
const applyUploadedDocumentFile = async (file: File): Promise<void> => {
  const fileType = getUploadedDocumentFileType(file);

  if (!fileType) {
    documentFormError.value = '仅支持上传 md、markdown 或 txt 文档';
    return;
  }

  if (file.size > maxDocumentUploadBytes) {
    documentFormError.value = '文档内容不能超过 1MB';
    return;
  }

  try {
    const content = await file.text();
    documentForm.value = {
      ...documentForm.value,
      title: documentForm.value.title.trim() || normalizeUploadedDocumentTitle(file.name),
      fileType,
      originalName: normalizeUploadedDocumentName(file.name, fileType),
      content
    };
    documentEditorMode.value = 'write';
    documentFormError.value = '';
    documentFormRef.value?.clearValidate();
    ElMessage.success('文档已读取，可继续在线编辑后保存');
  } catch (error: unknown) {
    documentFormError.value = error instanceof Error ? error.message : '文档读取失败';
    console.error(documentFormError.value);
  }
};

/**
 * 处理文档上传选择
 * @param files - 上传组件返回的文件列表
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const handleDocumentFilesSelected = async (files: File[]): Promise<void> => {
  const firstFile = files[0];

  if (!firstFile) {
    return;
  }

  await applyUploadedDocumentFile(firstFile);
};

const openCreateDocumentDialog = (): void => {
  documentDialogMode.value = 'create';
  documentEditorMode.value = 'write';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  documentForm.value = {
    title: '',
    category: '备忘',
    fileType: 'md',
    originalName: '',
    content: '',
    remark: ''
  };
  documentDialogVisible.value = true;
};

const fillDocumentForm = (item: DocumentListItem, content = ''): void => {
  documentForm.value = {
    id: item.id,
    title: item.title,
    category: normalizeDocumentCategory(item.category),
    fileType: item.fileType,
    originalName: item.originalName,
    content,
    remark: item.remark || ''
  };
};

const loadDocumentDetail = async (item: DocumentListItem): Promise<void> => {
  documentContentLoading.value = true;
  documentFormError.value = '';

  try {
    const response = await request<DocumentDetailData>(`/api/documents/${item.id}`);

    if (!response.success) {
      documentFormError.value = response.message;
      return;
    }

    fillDocumentForm(response.data, response.data.content);
  } catch (error: unknown) {
    documentFormError.value = error instanceof Error ? error.message : '文档内容加载失败';
    console.error(documentFormError.value);
  } finally {
    documentContentLoading.value = false;
  }
};

const openViewDocumentDialog = async (item: DocumentListItem): Promise<void> => {
  documentDialogMode.value = 'view';
  documentEditorMode.value = item.fileType === 'md' ? 'preview' : 'write';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  fillDocumentForm(item);
  documentDialogVisible.value = true;
  await loadDocumentDetail(item);
};

const openEditDocumentDialog = async (item: DocumentListItem): Promise<void> => {
  documentDialogMode.value = 'edit';
  documentEditorMode.value = 'write';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  fillDocumentForm(item);
  documentDialogVisible.value = true;
  await loadDocumentDetail(item);
};

const switchDocumentDialogToEdit = (): void => {
  documentDialogMode.value = 'edit';
  documentEditorMode.value = 'write';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
};

const closeDocumentDialog = (): void => {
  documentDialogVisible.value = false;
  documentEditorMode.value = 'write';
  documentSubmitAttempted.value = false;
  documentContentLoading.value = false;
};

const submitDocumentForm = async (): Promise<void> => {
  if (isDocumentDialogReadonly.value || props.documentOperationLoading || documentContentLoading.value) {
    return;
  }

  if (!documentFormRef.value) {
    return;
  }

  const valid = await documentFormRef.value.validate();

  if (!valid) {
    return;
  }

  const normalizedOriginalName = documentForm.value.originalName.trim() || normalizeDocumentFileName(documentForm.value.title, documentForm.value.fileType);
  documentFormError.value = '';
  documentSubmitAttempted.value = true;
  emit('saveDocument', {
    ...documentForm.value,
    originalName: normalizedOriginalName
  });
};

const requestDeleteDocument = (id: string): void => {
  if (!props.documentOperationLoading) {
    emit('deleteDocument', id);
  }
};

/**
 * 弹窗确认删除文档记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeleteDocument = async (): Promise<void> => {
  if (!documentForm.value.id || props.documentOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除这篇文档？', '删除文档', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    requestDeleteDocument(documentForm.value.id);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

/**
 * 根据上传文件推断简历类型
 * @param file - 用户选择的本地文件
 * @returns 支持的简历类型，不支持时返回 null
 * @throws 不抛出异常
 */
const getUploadedResumeFileType = (file: File): ResumeFileType | null => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    return 'pdf';
  }

  if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }

  return null;
};

/**
 * 根据上传文件名生成简历标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的简历标题
 * @throws 不抛出异常
 */
const normalizeUploadedResumeTitle = (fileName: string): string => {
  const title = fileName.replace(/\.(docx|pdf)$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名简历';
};

/**
 * 读取上传的 docx/pdf 简历并填充表单
 * @param file - 用户选择的本地文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const applyUploadedResumeFile = (file: File): void => {
  const fileType = getUploadedResumeFileType(file);

  if (!fileType) {
    resumeFormError.value = '仅支持上传 docx 或 pdf 简历';
    return;
  }

  if (file.size > maxResumeUploadBytes) {
    resumeFormError.value = '简历文件不能超过 20MB';
    return;
  }

  selectedResumeFile.value = file;
  resumeForm.value = {
    ...resumeForm.value,
    title: resumeForm.value.title.trim() || normalizeUploadedResumeTitle(file.name),
    originalName: file.name
  };
  resumeFormError.value = '';
  resumeFormRef.value?.clearValidate();
  ElMessage.success('简历文件已选择，确认信息后保存');
};

/**
 * 处理简历上传选择
 * @param files - 上传组件返回的文件列表
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const handleResumeFilesSelected = (files: File[]): void => {
  const firstFile = files[0];

  if (!firstFile) {
    return;
  }

  applyUploadedResumeFile(firstFile);
};

const openCreateResumeDialog = (): void => {
  resumeDialogMode.value = 'create';
  resumeFormError.value = '';
  resumeSubmitAttempted.value = false;
  selectedResumeFile.value = null;
  resumeForm.value = {
    title: '',
    category: '通用',
    originalName: '',
    remark: ''
  };
  resumeDialogVisible.value = true;
};

const openEditResumeDialog = (item: FileAssetListItem): void => {
  resumeDialogMode.value = 'edit';
  resumeFormError.value = '';
  resumeSubmitAttempted.value = false;
  selectedResumeFile.value = null;
  resumeForm.value = {
    id: item.id,
    title: item.title,
    category: item.category || '通用',
    originalName: item.originalName,
    remark: item.remark || ''
  };
  resumeDialogVisible.value = true;
};

const closeResumeDialog = (): void => {
  resumeDialogVisible.value = false;
  resumeSubmitAttempted.value = false;
  selectedResumeFile.value = null;
};

const submitResumeForm = async (): Promise<void> => {
  if (props.resumeOperationLoading) {
    return;
  }

  if (!resumeFormRef.value) {
    return;
  }

  const valid = await resumeFormRef.value.validate();

  if (!valid) {
    return;
  }

  if (resumeDialogMode.value === 'create' && !selectedResumeFile.value) {
    resumeFormError.value = '请先选择 docx 或 pdf 简历文件';
    return;
  }

  resumeFormError.value = '';
  resumeSubmitAttempted.value = true;
  emit('saveResume', {
    id: resumeForm.value.id,
    title: resumeForm.value.title,
    category: resumeForm.value.category,
    file: selectedResumeFile.value || undefined,
    remark: resumeForm.value.remark
  });
};

/**
 * 打开简历文件
 * @param item - 简历文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const openResumePreviewWindow = (): Window | null => {
  const previewWindow = window.open('', '_blank');

  if (!previewWindow) {
    return null;
  }

  previewWindow.opener = null;
  previewWindow.document.title = '正在打开简历预览';
  previewWindow.document.body.textContent = '正在打开简历预览...';
  return previewWindow;
};

const openResumeFile = async (item: FileAssetListItem): Promise<void> => {
  if (resumePreviewingId.value) {
    return;
  }

  const previewWindow = openResumePreviewWindow();

  if (!previewWindow) {
    ElMessage.error('浏览器拦截了预览窗口，请允许弹窗后重试');
    return;
  }

  resumePreviewingId.value = item.id;

  try {
    const resumeId = encodeURIComponent(item.id);
    const response = await request<ResumePreviewData>(`/api/resumes/${resumeId}/preview`);

    if (!response.success) {
      previewWindow.close();
      ElMessage.error(response.message);
      return;
    }

    previewWindow.location.replace(response.data.url);
  } catch (error: unknown) {
    previewWindow.close();

    if (error instanceof Error) {
      console.error(error.message);
    }

    ElMessage.error('简历预览链接创建失败');
  } finally {
    resumePreviewingId.value = '';
  }
};

/**
 * 弹窗确认删除简历文件
 * @param item - 简历文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeleteResume = async (item: FileAssetListItem): Promise<void> => {
  if (props.resumeOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除这份简历？', '删除简历', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteResume', item.id);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

const confirmDeleteCurrentResume = async (): Promise<void> => {
  const resumeId = resumeForm.value.id;

  if (!resumeId || props.resumeOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后会移除这份简历记录和文件，确认删除吗？', '删除简历文件', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteResume', resumeId);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

/**
 * 判断本地文件是否为支持的图片
 * @param file - 用户选择的本地文件
 * @returns 是否支持上传
 * @throws 不抛出异常
 */
const isSupportedImageFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const supportedByName = /\.(gif|jpe?g|png|webp)$/.test(fileName);
  const supportedByMime = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  return supportedByName || supportedByMime;
};

/**
 * 根据上传文件名生成图片标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的图片标题
 * @throws 不抛出异常
 */
const normalizeUploadedImageTitle = (fileName: string): string => {
  const title = fileName.replace(/\.(gif|jpe?g|png|webp)$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名图片';
};

/**
 * 读取上传图片并填充表单
 * @param file - 用户选择的本地文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const applyUploadedImageFile = (file: File): void => {
  if (!isSupportedImageFile(file)) {
    imageFormError.value = '仅支持上传 jpg、jpeg、png、webp 或 gif 图片';
    return;
  }

  if (file.size > maxImageUploadBytes) {
    imageFormError.value = '图片文件不能超过 15MB';
    return;
  }

  selectedImageFile.value = file;
  imageForm.value = {
    ...imageForm.value,
    title: imageForm.value.title.trim() || normalizeUploadedImageTitle(file.name),
    originalName: file.name
  };
  imageFormError.value = '';
  imageFormRef.value?.clearValidate();
  ElMessage.success('图片已选择，确认信息后保存');
};

/**
 * 处理图片上传选择
 * @param files - 上传组件返回的文件列表
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const handleImageFilesSelected = (files: File[]): void => {
  const firstFile = files[0];

  if (!firstFile) {
    return;
  }

  applyUploadedImageFile(firstFile);
};

/**
 * 打开图片上传弹窗
 * @param category - 需要默认选中的图片分类；可选，默认使用当前分类或证件照
 * @returns 无返回值
 * @throws 不抛出异常
 */
const openCreateImageDialog = (category?: string): void => {
  const targetCategory = typeof category === 'string' ? category : '';
  const defaultCategory = targetCategory || (activeCategory.value !== allCategoryLabel ? activeCategory.value : '证件照');

  imageDialogMode.value = 'create';
  imageFormError.value = '';
  imageSubmitAttempted.value = false;
  selectedImageFile.value = null;
  imageForm.value = {
    title: '',
    category: defaultCategory,
    originalName: '',
    remark: ''
  };
  imageDialogVisible.value = true;
};

const openEditImageDialog = (item: FileAssetListItem): void => {
  imagePreviewDialogVisible.value = false;
  imageDialogMode.value = 'edit';
  imageFormError.value = '';
  imageSubmitAttempted.value = false;
  selectedImageFile.value = null;
  imageForm.value = {
    id: item.id,
    title: item.title,
    category: normalizeImageCategory(item.category),
    originalName: item.originalName,
    remark: item.remark || ''
  };
  imageDialogVisible.value = true;
};

const closeImageDialog = (): void => {
  imageDialogVisible.value = false;
  imageSubmitAttempted.value = false;
  selectedImageFile.value = null;
};

const submitImageForm = async (): Promise<void> => {
  if (props.imageOperationLoading) {
    return;
  }

  if (!imageFormRef.value) {
    return;
  }

  const valid = await imageFormRef.value.validate();

  if (!valid) {
    return;
  }

  if (imageDialogMode.value === 'create' && !selectedImageFile.value) {
    imageFormError.value = '请先选择需要上传的图片';
    return;
  }

  imageFormError.value = '';
  imageSubmitAttempted.value = true;
  emit('saveImage', {
    id: imageForm.value.id,
    title: imageForm.value.title,
    category: imageForm.value.category,
    file: selectedImageFile.value || undefined,
    remark: imageForm.value.remark
  });
};

/**
 * 打开图片预览弹窗
 * @param item - 图片文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const openImagePreviewDialog = (item: FileAssetListItem): void => {
  if (!isImagePreviewable(item)) {
    ElMessage.error('当前文件不是可预览图片，请重新上传图片文件');
    return;
  }

  previewImageItem.value = item;
  previewImageSource.value = 'images';
  imagePreviewDialogVisible.value = true;
};

const closeImagePreviewDialog = (): void => {
  imagePreviewDialogVisible.value = false;
  previewImageItem.value = null;
  previewImageSource.value = 'images';
};

/**
 * 下载图片文件
 * @param item - 图片文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const downloadImage = (item: FileAssetListItem): void => {
  if (!isImagePreviewable(item)) {
    ElMessage.error('当前文件不是可下载图片，请重新上传图片文件');
    return;
  }

  triggerFileDownload(buildImageFileUrl(item, true), item.originalName);
};

/**
 * 弹窗确认删除图片文件
 * @param item - 图片文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeleteImage = async (item: FileAssetListItem): Promise<void> => {
  if (props.imageOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除这张图片？', '删除图片', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteImage', item.id);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

const confirmDeleteCurrentImage = async (): Promise<void> => {
  const imageId = imageForm.value.id;

  if (!imageId || props.imageOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后会移除这张图片记录和文件，确认删除吗？', '删除图片文件', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteImage', imageId);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

/**
 * 判断本地文件是否为支持的证件或学习资料文件
 * @param file - 用户选择的本地文件
 * @returns 是否支持上传
 * @throws 不抛出异常
 */
const isSupportedGenericFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const supportedByName = /\.(jpe?g|png|webp|gif|pdf|docx?|md|txt)$/.test(fileName);
  const supportedByMime = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain'
  ].includes(file.type);

  return supportedByName || supportedByMime;
};

/**
 * 根据上传文件名生成通用文件标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的文件标题
 * @throws 不抛出异常
 */
const normalizeUploadedGenericFileTitle = (fileName: string): string => {
  const title = fileName.replace(/\.[^.]+$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名文件';
};

/**
 * 读取上传文件并填充证件或学习资料表单
 * @param file - 用户选择的本地文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const applyUploadedGenericFile = (file: File): void => {
  if (!isSupportedGenericFile(file)) {
    fileFormError.value = '仅支持上传图片、PDF、Word、Markdown 或 TXT 文件';
    return;
  }

  if (file.size > maxGenericFileUploadBytes) {
    fileFormError.value = '文件不能超过 25MB';
    return;
  }

  selectedGenericFile.value = file;
  fileForm.value = {
    ...fileForm.value,
    title: fileForm.value.title.trim() || normalizeUploadedGenericFileTitle(file.name),
    originalName: file.name
  };
  fileFormError.value = '';
  fileFormRef.value?.clearValidate();
  ElMessage.success('文件已选择，确认信息后保存');
};

/**
 * 处理证件或学习资料文件选择
 * @param files - 上传组件返回的文件列表
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const handleGenericFilesSelected = (files: File[]): void => {
  const firstFile = files[0];

  if (!firstFile) {
    return;
  }

  applyUploadedGenericFile(firstFile);
};

/**
 * 打开证件或学习资料上传弹窗
 * @param category - 默认分类
 * @returns 无返回值
 * @throws 不抛出异常
 */
const openCreateFileDialog = (category?: string): void => {
  const targetCategory = typeof category === 'string' ? category : '';

  fileDialogMode.value = 'create';
  fileFormError.value = '';
  fileSubmitAttempted.value = false;
  selectedGenericFile.value = null;
  fileForm.value = {
    title: '',
    category: targetCategory || defaultFileCategory.value,
    originalName: '',
    remark: ''
  };
  fileDialogVisible.value = true;
};

/**
 * 打开证件或学习资料编辑弹窗
 * @param item - 文件记录
 * @returns 无返回值
 * @throws 不抛出异常
 */
const openEditFileDialog = (item: FileAssetListItem): void => {
  fileDialogMode.value = 'edit';
  fileFormError.value = '';
  fileSubmitAttempted.value = false;
  selectedGenericFile.value = null;
  fileForm.value = {
    id: item.id,
    title: item.title,
    category: isStudyModule.value ? normalizeStudyCategory(item.category) : normalizeCertificateCategory(item.category),
    originalName: item.originalName,
    remark: item.remark || ''
  };
  fileDialogVisible.value = true;
};

/**
 * 关闭证件或学习资料文件弹窗
 * @returns 无返回值
 * @throws 不抛出异常
 */
const closeFileDialog = (): void => {
  fileDialogVisible.value = false;
  fileSubmitAttempted.value = false;
  selectedGenericFile.value = null;
};

/**
 * 提交证件或学习资料文件表单
 * @returns 无返回值
 * @throws 表单校验异常由 Element Plus 处理
 */
const submitFileForm = async (): Promise<void> => {
  if (props.fileOperationLoading || !isEditableFileModule.value) {
    return;
  }

  if (!fileFormRef.value) {
    return;
  }

  const valid = await fileFormRef.value.validate();

  if (!valid) {
    return;
  }

  if (fileDialogMode.value === 'create' && !selectedGenericFile.value) {
    fileFormError.value = '请先选择需要上传的文件';
    return;
  }

  fileFormError.value = '';
  fileSubmitAttempted.value = true;
  emit('saveFile', {
    module: props.module.key,
    id: fileForm.value.id,
    title: fileForm.value.title,
    category: fileForm.value.category,
    file: selectedGenericFile.value || undefined,
    remark: fileForm.value.remark
  });
};

/**
 * 下载证件或学习资料文件
 * @param item - 文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const downloadFile = (item: FileAssetListItem): void => {
  triggerFileDownload(buildStoredFileUrl(item, true), item.originalName);
};

/**
 * 预览证件或学习资料图片
 * @param item - 文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const openGenericImagePreviewDialog = (item: FileAssetListItem): void => {
  if (!isImagePreviewable(item)) {
    downloadFile(item);
    return;
  }

  previewImageItem.value = item;
  previewImageSource.value = 'files';
  imagePreviewDialogVisible.value = true;
};

/**
 * 按预览来源打开正确的编辑弹窗
 * @param item - 正在预览的图片文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const openEditPreviewImageDialog = (item: FileAssetListItem): void => {
  if (previewImageSource.value === 'files') {
    closeImagePreviewDialog();
    openEditFileDialog(item);
    return;
  }

  openEditImageDialog(item);
};

/**
 * 弹窗确认删除证件或学习资料文件
 * @param item - 文件记录
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeleteFile = async (item: FileAssetListItem): Promise<void> => {
  if (props.fileOperationLoading) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后会移除这条记录和文件，确认删除吗？', '删除文件', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteFile', { module: item.module, id: item.id });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

/**
 * 弹窗确认删除当前编辑的证件或学习资料文件
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const confirmDeleteCurrentFile = async (): Promise<void> => {
  const fileId = fileForm.value.id;

  if (!fileId || props.fileOperationLoading || !isEditableFileModule.value) {
    return;
  }

  try {
    await ElMessageBox.confirm('删除后会移除这条记录和文件，确认删除吗？', '删除文件', {
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      lockScroll: false,
      modal: false,
      type: 'warning'
    });
    emit('deleteFile', { module: props.module.key, id: fileId });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};

watch(
  () => props.module.key,
  () => {
    activeCategory.value = allCategoryLabel;
    keyword.value = '';
    passwordDialogVisible.value = false;
    documentDialogVisible.value = false;
    resumeDialogVisible.value = false;
    imageDialogVisible.value = false;
    fileDialogVisible.value = false;
    imagePreviewDialogVisible.value = false;
  }
);

watch(
  categoryTabs,
  (tabs) => {
    if (!tabs.includes(activeCategory.value)) {
      activeCategory.value = allCategoryLabel;
    }
  }
);

watch(
  () => documentForm.value.fileType,
  (fileType) => {
    if (fileType !== 'md') {
      documentEditorMode.value = 'write';
    }
  }
);

watch(
  () => props.passwordSuccessVersion,
  () => {
    if (passwordDialogVisible.value && !isPasswordDialogReadonly.value) {
      closePasswordDrawer();
    }
  }
);

watch(
  () => props.passwordDeleteSuccessVersion,
  () => {
    if (passwordDialogVisible.value) {
      closePasswordDrawer();
    }
  }
);

watch(
  () => props.documentSuccessVersion,
  () => {
    if (documentDialogVisible.value && !isDocumentDialogReadonly.value) {
      closeDocumentDialog();
    }
  }
);

watch(
  () => props.documentDeleteSuccessVersion,
  () => {
    if (documentDialogVisible.value) {
      closeDocumentDialog();
    }
  }
);

watch(
  () => props.resumeSuccessVersion,
  () => {
    if (resumeDialogVisible.value) {
      closeResumeDialog();
    }
  }
);

watch(
  () => props.resumeDeleteSuccessVersion,
  () => {
    if (resumeDialogVisible.value) {
      closeResumeDialog();
    }
  }
);

watch(
  () => props.imageSuccessVersion,
  () => {
    if (imageDialogVisible.value) {
      closeImageDialog();
    }
  }
);

watch(
  () => props.imageDeleteSuccessVersion,
  () => {
    if (imageDialogVisible.value) {
      closeImageDialog();
    }

    if (imagePreviewDialogVisible.value) {
      closeImagePreviewDialog();
    }
  }
);

watch(
  () => props.fileSuccessVersion,
  () => {
    if (fileDialogVisible.value) {
      closeFileDialog();
    }
  }
);

watch(
  () => props.fileDeleteSuccessVersion,
  () => {
    if (fileDialogVisible.value) {
      closeFileDialog();
    }

    if (imagePreviewDialogVisible.value && previewImageItem.value && isEditableFileModule.value) {
      closeImagePreviewDialog();
    }
  }
);
</script>

<template>
  <div class="module-detail">
    <header class="module-detail__header">
      <div class="module-detail__topbar">
        <button class="module-detail__brand" type="button" @click="emit('backHome')">
          <span class="module-detail__brand-mark">A</span>
          <span class="module-detail__brand-copy">
            <span class="module-detail__brand-en">{{ APP_ENGLISH_NAME }}</span>
            <span class="module-detail__breadcrumb">
              <strong class="module-detail__brand-name">{{ APP_NAME }}</strong>
              <span class="module-detail__breadcrumb-separator">/</span>
              <strong class="module-detail__breadcrumb-current">{{ props.module.name }}</strong>
            </span>
          </span>
        </button>

        <nav class="module-detail__nav" aria-label="档案模块">
          <div class="module-detail__nav-track">
            <button
              class="module-detail__nav-item"
              type="button"
              @click="emit('backHome')"
            >
              <span>首页</span>
            </button>
            <button
              v-for="moduleItem in ARCHIVE_MODULES"
              :key="moduleItem.key"
              class="module-detail__nav-item"
              :class="{ 'module-detail__nav-item--active': moduleItem.key === props.module.key }"
              type="button"
              @click="emit('openModule', moduleItem.key)"
            >
              <span>{{ moduleItem.name }}</span>
            </button>
          </div>
        </nav>

        <div class="module-detail__actions">
          <el-dropdown
            class="module-detail__user-menu"
            trigger="click"
            popper-class="module-detail__avatar-menu"
            @command="handleUserMenuCommand"
          >
            <button
              class="module-detail__avatar"
              type="button"
              :title="props.userName || '当前用户'"
              aria-label="打开用户菜单"
            >
              {{ userAvatarText }}
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <main class="module-detail__main">
      <Transition name="module-route" mode="out-in" appear>
        <section :key="moduleContentTransitionKey" class="module-detail__panel module-detail__panel--workspace">
        <div class="module-detail__workspace-head">
          <div class="module-detail__intro">
            <div class="module-detail__title-row">
              <div>
                <p class="module-detail__eyebrow">Module</p>
                <div class="module-detail__title-stack">
                  <h1 class="module-detail__title">{{ props.module.name }}</h1>
                  <span class="module-detail__count-pill">{{ props.items.length }} 条记录</span>
                </div>
              </div>
            </div>
            <p class="module-detail__description">{{ props.module.description }}</p>
          </div>
        </div>

        <div class="module-detail__workspace-toolbar">
          <nav class="module-detail__category-tabs" aria-label="快捷分类切换">
            <button
              v-for="category in categoryTabs"
              :key="category"
              class="module-detail__category-tab"
              :class="{ 'module-detail__category-tab--active': activeCategory === category }"
              type="button"
              :aria-pressed="activeCategory === category"
              @click="selectCategoryTab(category)"
            >
              {{ category }}
            </button>
          </nav>

          <div class="module-detail__workspace-tools">
            <form class="module-detail__search" @submit.prevent="handleSearch">
              <AppInput
                v-model="keyword"
                label="模块搜索"
                type="search"
                placeholder="搜索标题、分类、备注"
              />
              <AppButton type="submit" :loading="props.loading">搜索</AppButton>
            </form>
            <AppButton
              v-if="isPasswordModule"
              variant="secondary"
              @click="openCreatePasswordDrawer"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              新增密码
            </AppButton>
            <AppButton
              v-if="isDocumentModule"
              variant="secondary"
              @click="openCreateDocumentDialog"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              新增文档
            </AppButton>
            <AppButton
              v-if="isResumeModule"
              variant="secondary"
              @click="openCreateResumeDialog"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              上传简历
            </AppButton>
            <AppButton
              v-if="isImageModule"
              variant="secondary"
              @click="openCreateImageDialog()"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              上传图片
            </AppButton>
            <AppButton
              v-if="isEditableFileModule"
              variant="secondary"
              @click="openCreateFileDialog()"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              {{ isStudyModule ? '上传资料' : '上传证件' }}
            </AppButton>
          </div>
        </div>

        <Transition name="archive-category" mode="out-in">
          <div :key="categoryContentTransitionKey" class="module-detail__content-stage">
            <div v-if="props.errorMessage" class="module-detail__empty module-detail__empty--error">
              {{ props.errorMessage }}
            </div>
            <div v-else-if="props.loading && props.items.length === 0" class="module-detail__empty">正在加载模块数据...</div>
            <div v-else-if="props.items.length === 0" class="module-detail__empty">暂无数据</div>
            <div v-else-if="visibleCategoryGroupCount === 0" class="module-detail__empty">当前分类暂无数据</div>

            <template v-else-if="isPasswordModule">
              <section
                v-for="group in visiblePasswordGroups"
                :key="group.name"
                class="module-detail__category-block"
              >
                <header class="module-detail__category-head">
                  <h2 class="module-detail__category-title">{{ group.name }}</h2>
                  <span class="module-detail__category-count">{{ group.items.length }} 条</span>
                </header>

                <TransitionGroup name="archive-row" tag="div" class="module-detail__simple-list">
                  <button
                    v-for="item in group.items"
                    :key="item.id"
                    class="module-detail__simple-row"
                    type="button"
                    @click="openViewPasswordDrawer(item)"
                  >
                    <span class="module-detail__simple-icon module-detail__simple-icon--password" aria-hidden="true">
                      {{ getPasswordAvatarText(item.title) }}
                    </span>

                    <span class="module-detail__simple-main">
                      <span class="module-detail__simple-title">{{ item.title }}</span>
                      <span class="module-detail__simple-meta">{{ getPasswordSummaryText(item) }}</span>
                    </span>

                    <span class="module-detail__simple-count">{{ getPasswordAccountCountText(item) }}</span>
                    <el-icon class="module-detail__simple-arrow"><ArrowRight /></el-icon>
                  </button>
                </TransitionGroup>
              </section>
            </template>

            <template v-else-if="isDocumentModule">
              <div class="module-detail__document-category-grid">
                <section
                  v-for="group in visibleDocumentGroups"
                  :key="group.name"
                  class="module-detail__category-block module-detail__category-block--document"
                >
                  <header class="module-detail__category-head">
                    <h2 class="module-detail__category-title">{{ group.name }}</h2>
                    <span class="module-detail__category-count">{{ group.items.length }} 条</span>
                  </header>

                  <TransitionGroup name="archive-row" tag="div" class="module-detail__document-card-list">
                    <article
                      v-for="item in group.items"
                      :key="item.id"
                      class="module-detail__document-card"
                    >
                      <span
                        class="module-detail__simple-icon module-detail__simple-icon--document"
                        :class="`module-detail__simple-icon--document-${item.fileType}`"
                        aria-hidden="true"
                      >
                        {{ item.fileType.toUpperCase() }}
                      </span>

                      <span class="module-detail__document-card-main">
                        <span class="module-detail__simple-title">{{ item.title }}</span>
                        <span class="module-detail__simple-meta">{{ item.originalName }}</span>
                        <span class="module-detail__document-card-meta">
                          <span class="module-detail__document-card-size">{{ formatSize(item.size) }}</span>
                          <span class="module-detail__document-card-date">{{ item.updatedAt }}</span>
                        </span>
                      </span>

                      <span class="module-detail__document-actions">
                        <el-button class="module-detail__document-action" text @click="openViewDocumentDialog(item)">查看</el-button>
                        <el-button class="module-detail__document-action" text @click="downloadDocument(item)">下载</el-button>
                        <el-button class="module-detail__document-action" type="primary" text @click="openEditDocumentDialog(item)">编辑</el-button>
                      </span>
                    </article>
                  </TransitionGroup>
                </section>
              </div>
            </template>

            <template v-else-if="isResumeModule">
              <div class="module-detail__resume-category-grid">
                <section
                  v-for="group in visibleResumeGroups"
                  :key="group.name"
                  class="module-detail__category-block module-detail__category-block--resume"
                >
                  <header class="module-detail__category-head">
                    <h2 class="module-detail__category-title">{{ group.name }}</h2>
                    <span class="module-detail__category-count">{{ group.items.length }} 条</span>
                  </header>

                  <TransitionGroup name="archive-row" tag="div" class="module-detail__resume-card-list">
                    <article
                      v-for="item in group.items"
                      :key="item.id"
                      class="module-detail__resume-card"
                    >
                      <span
                        class="module-detail__simple-icon module-detail__simple-icon--resume"
                        :class="`module-detail__simple-icon--resume-${getResumeExtensionText(item).toLowerCase()}`"
                        aria-hidden="true"
                      >
                        {{ getResumeExtensionText(item) }}
                      </span>

                      <span class="module-detail__resume-card-main">
                        <span class="module-detail__simple-title">{{ item.title }}</span>
                        <span class="module-detail__simple-meta">{{ item.originalName }}</span>
                        <span class="module-detail__resume-card-date">{{ item.updatedAt }}</span>
                        <span class="module-detail__resume-card-size">{{ formatSize(item.size) }}</span>
                      </span>

                      <span class="module-detail__resume-actions">
                        <el-button
                          class="module-detail__resume-action"
                          text
                          :loading="resumePreviewingId === item.id"
                          @click="openResumeFile(item)"
                        >
                          预览
                        </el-button>
                        <el-button class="module-detail__resume-action" type="primary" text @click="openEditResumeDialog(item)">编辑</el-button>
                        <el-button class="module-detail__resume-action" type="danger" text @click="confirmDeleteResume(item)">删除</el-button>
                      </span>
                    </article>
                  </TransitionGroup>
                </section>
              </div>
            </template>

            <template v-else-if="isImageModule">
              <div class="module-detail__image-category-grid">
                <section
                  v-for="group in visibleImageGroups"
                  :key="group.name"
                  class="module-detail__category-block module-detail__category-block--image"
                >
                  <header class="module-detail__category-head">
                    <h2 class="module-detail__category-title">{{ group.name }}</h2>
                    <span class="module-detail__category-count">{{ group.items.length }} 条</span>
                  </header>

                  <TransitionGroup name="archive-row" tag="div" class="module-detail__image-card-list">
                    <article
                      v-for="item in group.items"
                      :key="item.id"
                      class="module-detail__image-card"
                    >
                      <button
                        class="module-detail__image-thumb"
                        type="button"
                        @click="openImagePreviewDialog(item)"
                      >
                        <img
                          v-if="isImagePreviewable(item)"
                          :src="buildImageFileUrl(item)"
                          :alt="item.title"
                          loading="lazy"
                        >
                        <span v-else class="module-detail__image-thumb-fallback">
                          {{ getImageExtensionText(item) }}
                        </span>
                      </button>

                      <div class="module-detail__image-card-main">
                        <span class="module-detail__simple-title">{{ item.title }}</span>
                        <span class="module-detail__image-card-meta">
                          <span>{{ item.updatedAt }}</span>
                          <span>{{ formatSize(item.size) }}</span>
                        </span>
                      </div>

                      <div class="module-detail__image-actions">
                        <el-button class="module-detail__image-action" text aria-label="预览图片" @click="openImagePreviewDialog(item)">
                          <el-icon><View /></el-icon>
                        </el-button>
                        <el-button class="module-detail__image-action" text aria-label="下载图片" @click="downloadImage(item)">
                          <el-icon><Download /></el-icon>
                        </el-button>
                        <el-button class="module-detail__image-action" type="primary" text aria-label="编辑图片" @click="openEditImageDialog(item)">
                          <el-icon><EditPen /></el-icon>
                        </el-button>
                        <el-button class="module-detail__image-action" type="danger" text aria-label="删除图片" @click="confirmDeleteImage(item)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </article>

                    <button
                      :key="`upload-${group.name}`"
                      class="module-detail__image-upload-card"
                      type="button"
                      @click="openCreateImageDialog(group.name)"
                    >
                      <el-icon class="module-detail__image-upload-icon"><Plus /></el-icon>
                      <span>上传新图片</span>
                    </button>
                  </TransitionGroup>
                </section>
              </div>
            </template>

            <template v-else>
              <section
                v-for="group in visibleFileGroups"
                :key="group.name"
                class="module-detail__category-block"
              >
                <header class="module-detail__category-head">
                  <h2 class="module-detail__category-title">{{ group.name }}</h2>
                  <span class="module-detail__category-count">{{ group.items.length }} 条</span>
                </header>

                <TransitionGroup name="archive-row" tag="div" class="module-detail__file-list">
                  <article v-for="item in group.items" :key="item.id" class="module-detail__file-row">
                    <div class="module-detail__file-type">
                      <span class="module-detail__file-extension">{{ item.originalName.split('.').pop() || 'file' }}</span>
                    </div>
                    <div class="module-detail__file-content">
                      <h3 class="module-detail__file-title">{{ item.title }}</h3>
                      <p class="module-detail__file-remark">{{ item.remark || item.originalName }}</p>
                    </div>
                    <div class="module-detail__file-meta">
                      <span>{{ item.mimeType }}</span>
                      <span>{{ formatSize(item.size) }}</span>
                      <span>{{ item.updatedAt }}</span>
                    </div>
                    <div v-if="isEditableFileModule" class="module-detail__file-actions">
                      <el-button v-if="isImagePreviewable(item)" class="module-detail__file-action" text @click="openGenericImagePreviewDialog(item)">预览</el-button>
                      <el-button class="module-detail__file-action" text @click="downloadFile(item)">下载</el-button>
                      <el-button class="module-detail__file-action" type="primary" text @click="openEditFileDialog(item)">编辑</el-button>
                      <el-button class="module-detail__file-action" type="danger" text @click="confirmDeleteFile(item)">删除</el-button>
                    </div>
                  </article>
                  <button
                    v-if="isEditableFileModule"
                    :key="`upload-${group.name}`"
                    class="module-detail__file-upload-row"
                    type="button"
                    @click="openCreateFileDialog(group.name)"
                  >
                    <el-icon class="module-detail__button-icon"><Plus /></el-icon>
                    <span>{{ isStudyModule ? '上传新资料' : '上传新证件' }}</span>
                  </button>
                </TransitionGroup>
              </section>
            </template>
          </div>
        </Transition>
        </section>
      </Transition>
    </main>

    <el-dialog
      v-model="passwordDialogVisible"
      class="module-detail__password-dialog"
      width="680px"
      :close-on-click-modal="!props.passwordOperationLoading"
      :close-on-press-escape="!props.passwordOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Password</p>
            <h2 class="module-detail__drawer-title">{{ passwordDialogTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭弹窗" @click="closePasswordDrawer">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="passwordFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element"
        :class="{ 'module-detail__drawer-form--readonly': isPasswordDialogReadonly }"
        :model="passwordForm"
        :rules="passwordFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitPasswordForm"
      >
        <el-form-item class="module-detail__drawer-item" label="平台名称" prop="title">
          <el-input
            v-model="passwordForm.title"
            placeholder="例如：阿里云控制台"
            :readonly="isPasswordDialogReadonly"
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-input
            v-if="isPasswordDialogReadonly"
            v-model="passwordForm.category"
            readonly
          />
          <el-select
            v-else
            v-model="passwordForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
          >
            <el-option
              v-for="category in passwordCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录网址" prop="loginUrl">
          <el-input
            v-model="passwordForm.loginUrl"
            placeholder="https://example.com"
            :readonly="isPasswordDialogReadonly"
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录方式" prop="loginMethod">
          <el-input
            v-if="isPasswordDialogReadonly"
            v-model="passwordForm.loginMethod"
            readonly
          />
          <el-select
            v-else
            v-model="passwordForm.loginMethod"
            placeholder="选择或输入登录方式"
            filterable
            allow-create
            default-first-option
            clearable
            popper-class="module-detail__login-method-popper"
          >
            <el-option-group
              v-for="group in loginMethodOptionGroups"
              :key="group.label"
              :label="group.label"
            >
              <el-option
                v-for="method in group.options"
                :key="`${group.label}-${method}`"
                :label="method"
                :value="method"
              />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录账号" prop="account">
          <el-input
            v-model="passwordForm.account"
            placeholder="账号、手机号、邮箱或微信号"
            :readonly="isPasswordDialogReadonly"
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            placeholder="明文保存，仅个人查看"
            :readonly="isPasswordDialogReadonly"
            show-password
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="绑定手机号" prop="phone">
          <el-input
            v-model="passwordForm.phone"
            placeholder="可选"
            :readonly="isPasswordDialogReadonly"
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="绑定邮箱" prop="email">
          <el-input
            v-model="passwordForm.email"
            placeholder="可选"
            :readonly="isPasswordDialogReadonly"
            :clearable="!isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="passwordForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :readonly="isPasswordDialogReadonly"
          />
        </el-form-item>

        <el-alert
          v-if="passwordDialogErrorMessage"
          class="module-detail__drawer-alert"
          :title="passwordDialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="isPasswordDialogReadonly && passwordForm.id"
            type="danger"
            text
            :loading="props.passwordOperationLoading"
            @click="confirmDeletePassword"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button v-if="isPasswordDialogReadonly" type="primary" text @click="switchPasswordDialogToEdit">
            <el-icon><EditPen /></el-icon>
            编辑
          </el-button>
          <el-button @click="closePasswordDrawer">{{ isPasswordDialogReadonly ? '关闭' : '取消' }}</el-button>
          <el-button
            v-if="!isPasswordDialogReadonly"
            type="primary"
            :loading="props.passwordOperationLoading"
            @click="submitPasswordForm"
          >
            {{ passwordDialogMode === 'create' ? '新增' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="documentDialogVisible"
      class="module-detail__document-dialog"
      width="920px"
      :close-on-click-modal="!props.documentOperationLoading"
      :close-on-press-escape="!props.documentOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Document</p>
            <h2 class="module-detail__drawer-title">{{ documentDialogTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭弹窗" @click="closeDocumentDialog">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="documentFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element module-detail__document-form"
        :class="{ 'module-detail__drawer-form--readonly': isDocumentDialogReadonly }"
        :model="documentForm"
        :rules="documentFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitDocumentForm"
      >
        <el-form-item class="module-detail__drawer-item" label="文档标题" prop="title">
          <el-input
            v-model="documentForm.title"
            placeholder="例如：部署笔记"
            :readonly="isDocumentDialogReadonly"
            :clearable="!isDocumentDialogReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-input
            v-if="isDocumentDialogReadonly"
            v-model="documentForm.category"
            readonly
          />
          <el-select
            v-else
            v-model="documentForm.category"
            placeholder="选择分类"
            filterable
          >
            <el-option
              v-for="category in DOCUMENT_CATEGORY_OPTIONS"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="文档类型" prop="fileType">
          <el-input
            v-if="isDocumentDialogReadonly"
            :model-value="documentForm.fileType.toUpperCase()"
            readonly
          />
          <el-select v-else v-model="documentForm.fileType">
            <el-option
              v-for="option in documentFileTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="文件名" prop="originalName">
          <el-input
            v-model="documentForm.originalName"
            placeholder="不填则按标题生成"
            :readonly="isDocumentDialogReadonly"
            :clearable="!isDocumentDialogReadonly"
          />
        </el-form-item>

        <el-form-item
          v-if="!isDocumentDialogReadonly"
          class="module-detail__drawer-item module-detail__drawer-item--full module-detail__document-upload"
          label="上传文档"
        >
          <FileDropzone
            title="上传 MD / TXT"
            description="拖拽或选择 .md、.markdown、.txt 文件，读取后可继续在线编辑"
            :accept="documentUploadAccept"
            :multiple="false"
            @files-selected="handleDocumentFilesSelected"
          />
          <p class="module-detail__document-upload-tip">
            保存后会写入 uploads 当前账号 documents 目录。
          </p>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full module-detail__document-content" label="内容" prop="content">
          <div class="module-detail__document-editor-shell">
            <div class="module-detail__document-editor-head">
              <span class="module-detail__document-editor-title">
                {{ isDocumentMarkdown ? 'Markdown 内容' : 'TXT 内容' }}
              </span>
              <div v-if="isDocumentMarkdown" class="module-detail__document-editor-tabs" aria-label="Markdown 编辑模式">
                <button
                  class="module-detail__document-editor-tab"
                  :class="{ 'module-detail__document-editor-tab--active': documentEditorMode === 'write' }"
                  type="button"
                  @click="documentEditorMode = 'write'"
                >
                  编辑
                </button>
                <button
                  class="module-detail__document-editor-tab"
                  :class="{ 'module-detail__document-editor-tab--active': documentEditorMode === 'preview' }"
                  type="button"
                  @click="documentEditorMode = 'preview'"
                >
                  预览
                </button>
              </div>
            </div>

            <el-input
              v-if="documentEditorMode === 'write' || !isDocumentMarkdown"
              v-model="documentForm.content"
              class="module-detail__document-editor"
              :placeholder="documentContentPlaceholder"
              type="textarea"
              :rows="18"
              :readonly="isDocumentDialogReadonly"
              :disabled="documentContentLoading"
            />
            <div v-else class="module-detail__markdown-preview">
              <p v-if="!hasDocumentMarkdownContent" class="module-detail__markdown-empty">
                暂无 Markdown 内容
              </p>
              <div
                v-else
                class="module-detail__markdown-body"
                v-html="documentMarkdownPreviewHtml"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="documentForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :readonly="isDocumentDialogReadonly"
          />
        </el-form-item>

        <el-alert
          v-if="documentDialogErrorMessage"
          class="module-detail__drawer-alert"
          :title="documentDialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="isDocumentDialogReadonly && documentForm.id"
            text
            @click="downloadCurrentDocument"
          >
            <el-icon><Download /></el-icon>
            下载
          </el-button>
          <el-button
            v-if="isDocumentDialogReadonly && documentForm.id"
            type="danger"
            text
            :loading="props.documentOperationLoading"
            @click="confirmDeleteDocument"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button v-if="isDocumentDialogReadonly" type="primary" text @click="switchDocumentDialogToEdit">
            <el-icon><EditPen /></el-icon>
            编辑
          </el-button>
          <el-button @click="closeDocumentDialog">{{ isDocumentDialogReadonly ? '关闭' : '取消' }}</el-button>
          <el-button
            v-if="!isDocumentDialogReadonly"
            type="primary"
            :loading="props.documentOperationLoading || documentContentLoading"
            @click="submitDocumentForm"
          >
            {{ documentDialogMode === 'create' ? '新增' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resumeDialogVisible"
      class="module-detail__resume-dialog"
      width="720px"
      :close-on-click-modal="!props.resumeOperationLoading"
      :close-on-press-escape="!props.resumeOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Resume</p>
            <h2 class="module-detail__drawer-title">{{ resumeDialogTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭弹窗" @click="closeResumeDialog">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="resumeFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element module-detail__resume-form"
        :model="resumeForm"
        :rules="resumeFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitResumeForm"
      >
        <el-form-item class="module-detail__drawer-item" label="简历标题" prop="title">
          <el-input
            v-model="resumeForm.title"
            placeholder="例如：Java 后端简历"
            clearable
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-select
            v-model="resumeForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option
              v-for="category in resumeCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          class="module-detail__drawer-item module-detail__drawer-item--full module-detail__resume-upload"
          :label="resumeDialogMode === 'create' ? '上传简历' : '替换文件'"
        >
          <FileDropzone
            :title="resumeDialogMode === 'create' ? '上传 DOCX / PDF' : '替换 DOCX / PDF'"
            :description="resumeDialogMode === 'create' ? '拖拽或选择 .docx、.pdf 文件，保存后可直接打开或下载' : '拖拽或选择新的 .docx、.pdf 文件，保存后替换当前文件'"
            :accept="resumeUploadAccept"
            :multiple="false"
            @files-selected="handleResumeFilesSelected"
          />
          <p class="module-detail__resume-upload-tip">
            {{ resumeDialogMode === 'create' ? '保存后会写入 uploads 当前账号 resumes 目录。' : '未选择新文件时只保存标题、分类和备注。' }}
          </p>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" :label="resumeDialogMode === 'create' ? '已选择文件' : '当前文件'">
          <div class="module-detail__resume-selected">
            <span v-if="selectedResumeFile" class="module-detail__resume-selected-name">
              {{ resumeForm.originalName }} · {{ formatSize(selectedResumeFile.size) }}
            </span>
            <span v-else-if="resumeForm.originalName" class="module-detail__resume-selected-name">
              {{ resumeForm.originalName }}
            </span>
            <span v-else class="module-detail__resume-selected-empty">尚未选择文件</span>
          </div>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="resumeForm.remark"
            placeholder="例如：投递 Java 后端岗位使用"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </el-form-item>

        <el-alert
          v-if="resumeDialogErrorMessage"
          class="module-detail__drawer-alert"
          :title="resumeDialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="resumeDialogMode === 'edit' && resumeForm.id"
            type="danger"
            text
            :loading="props.resumeOperationLoading"
            @click="confirmDeleteCurrentResume"
          >
            删除文件
          </el-button>
          <el-button @click="closeResumeDialog">取消</el-button>
          <el-button
            type="primary"
            :loading="props.resumeOperationLoading"
            @click="submitResumeForm"
          >
            {{ resumeDialogMode === 'create' ? '保存' : '保存修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imageDialogVisible"
      class="module-detail__image-dialog"
      width="680px"
      :close-on-click-modal="!props.imageOperationLoading"
      :close-on-press-escape="!props.imageOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Image</p>
            <h2 class="module-detail__drawer-title">{{ imageDialogTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭弹窗" @click="closeImageDialog">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="imageFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element module-detail__image-form"
        :model="imageForm"
        :rules="imageFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitImageForm"
      >
        <el-form-item class="module-detail__drawer-item" label="图片标题" prop="title">
          <el-input
            v-model="imageForm.title"
            placeholder="例如：蓝底证件照"
            clearable
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-select
            v-model="imageForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option
              v-for="category in imageCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          class="module-detail__drawer-item module-detail__drawer-item--full module-detail__image-upload"
          :label="imageDialogMode === 'create' ? '上传图片' : '替换图片'"
        >
          <FileDropzone
            :title="imageDialogMode === 'create' ? '上传 JPG / PNG / WEBP / GIF' : '替换 JPG / PNG / WEBP / GIF'"
            :description="imageDialogMode === 'create' ? '拖拽或选择图片文件，保存后可预览和下载' : '不选择新文件时只保存标题、分类和备注'"
            :accept="imageUploadAccept"
            :multiple="false"
            @files-selected="handleImageFilesSelected"
          />
          <p class="module-detail__image-upload-tip">
            保存后会写入 uploads 当前账号 images 目录，单张图片最大 15MB。
          </p>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" :label="imageDialogMode === 'create' ? '已选择图片' : '当前图片'">
          <div class="module-detail__image-selected">
            <span v-if="selectedImageFile" class="module-detail__image-selected-name">
              {{ imageForm.originalName }} · {{ formatSize(selectedImageFile.size) }}
            </span>
            <span v-else-if="imageForm.originalName" class="module-detail__image-selected-name">
              {{ imageForm.originalName }}
            </span>
            <span v-else class="module-detail__image-selected-empty">尚未选择图片</span>
          </div>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="imageForm.remark"
            placeholder="补充图片用途或拍摄说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </el-form-item>

        <el-alert
          v-if="imageDialogErrorMessage"
          class="module-detail__drawer-alert"
          :title="imageDialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="imageDialogMode === 'edit' && imageForm.id"
            type="danger"
            text
            :loading="props.imageOperationLoading"
            @click="confirmDeleteCurrentImage"
          >
            删除图片
          </el-button>
          <el-button @click="closeImageDialog">取消</el-button>
          <el-button
            type="primary"
            :loading="props.imageOperationLoading"
            @click="submitImageForm"
          >
            {{ imageDialogMode === 'create' ? '保存' : '保存修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="fileDialogVisible"
      class="module-detail__file-dialog"
      width="680px"
      :close-on-click-modal="!props.fileOperationLoading"
      :close-on-press-escape="!props.fileOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">File</p>
            <h2 class="module-detail__drawer-title">{{ fileDialogTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭弹窗" @click="closeFileDialog">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="fileFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element module-detail__file-form"
        :model="fileForm"
        :rules="fileFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitFileForm"
      >
        <el-form-item class="module-detail__drawer-item" label="文件标题" prop="title">
          <el-input
            v-model="fileForm.title"
            placeholder="例如：身份证正面、Vue 学习笔记"
            clearable
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-select
            v-model="fileForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option
              v-for="category in fileCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          class="module-detail__drawer-item module-detail__drawer-item--full module-detail__file-upload"
          :label="fileDialogMode === 'create' ? '上传文件' : '替换文件'"
        >
          <FileDropzone
            :title="fileDialogMode === 'create' ? '上传图片 / 文档' : '替换图片 / 文档'"
            :description="fileDialogMode === 'create' ? '支持图片、PDF、Word、Markdown 和 TXT 文件' : '不选择新文件时只保存标题、分类和备注'"
            :accept="genericFileUploadAccept"
            :multiple="false"
            @files-selected="handleGenericFilesSelected"
          />
          <p class="module-detail__file-upload-tip">
            保存后会写入 uploads 当前账号 {{ props.module.key }} 目录，单个文件最大 25MB。
          </p>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" :label="fileDialogMode === 'create' ? '已选择文件' : '当前文件'">
          <div class="module-detail__file-selected">
            <span v-if="selectedGenericFile" class="module-detail__file-selected-name">
              {{ fileForm.originalName }} · {{ formatSize(selectedGenericFile.size) }}
            </span>
            <span v-else-if="fileForm.originalName" class="module-detail__file-selected-name">
              {{ fileForm.originalName }}
            </span>
            <span v-else class="module-detail__file-selected-empty">尚未选择文件</span>
          </div>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="fileForm.remark"
            placeholder="补充文件用途、来源或说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </el-form-item>

        <el-alert
          v-if="fileDialogErrorMessage"
          class="module-detail__drawer-alert"
          :title="fileDialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="fileDialogMode === 'edit' && fileForm.id"
            type="danger"
            text
            :loading="props.fileOperationLoading"
            @click="confirmDeleteCurrentFile"
          >
            删除文件
          </el-button>
          <el-button @click="closeFileDialog">取消</el-button>
          <el-button
            type="primary"
            :loading="props.fileOperationLoading"
            @click="submitFileForm"
          >
            {{ fileDialogMode === 'create' ? '保存' : '保存修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imagePreviewDialogVisible"
      class="module-detail__image-preview-dialog"
      width="760px"
      :show-close="false"
      :lock-scroll="false"
      align-center
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Preview</p>
            <h2 class="module-detail__drawer-title">{{ previewImageItem?.title || '图片预览' }}</h2>
          </div>
          <el-button circle text aria-label="关闭预览" @click="closeImagePreviewDialog">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <div v-if="previewImageItem" class="module-detail__image-preview">
        <img
          class="module-detail__image-preview-media"
          :src="buildImageFileUrl(previewImageItem)"
          :alt="previewImageItem.title"
        >
        <div class="module-detail__image-preview-meta">
          <span>{{ previewImageItem.originalName }}</span>
          <span>{{ formatSize(previewImageItem.size) }}</span>
          <span>{{ previewImageItem.updatedAt }}</span>
        </div>
      </div>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button v-if="previewImageItem" @click="downloadImage(previewImageItem)">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
          <el-button v-if="previewImageItem" type="primary" @click="openEditPreviewImageDialog(previewImageItem)">
            编辑
          </el-button>
          <el-button @click="closeImagePreviewDialog">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
