<script setup lang="ts">
/**
 * @component ModuleDetailShell
 * @description 个人档案模块工作台布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { computed, ref, watch } from 'vue';
import {
  ArrowRight,
  Close,
  Delete,
  EditPen,
  Plus
} from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessageBox,
  ElOption,
  ElSelect,
  type FormInstance,
  type FormRules
} from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
import { PASSWORD_CATEGORY_OPTIONS } from '~/constants/passwordCategories';
import type { DashboardSummaryData } from '~/types/api';
import type {
  ArchiveModuleConfig,
  ArchiveModuleKey,
  DocumentDetailData,
  DocumentFileType,
  DocumentFormPayload,
  DocumentListItem,
  FileAssetListItem,
  PasswordFormPayload,
  PasswordListItem
} from '~/types/models';
import { request } from '~/utils/request';

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
}

interface CategoryGroup<T> {
  /** 类型：字符串；含义：分类名称；是否必填：是；默认值：未分类 */
  name: string;
  /** 类型：泛型数组；含义：当前分类下的记录；是否必填：是；默认值：空数组 */
  items: T[];
}

const props = withDefaults(defineProps<ModuleDetailShellProps>(), {
  errorMessage: '',
  passwordOperationLoading: false,
  passwordOperationError: '',
  passwordSuccessVersion: 0,
  passwordDeleteSuccessVersion: 0,
  documentOperationLoading: false,
  documentOperationError: '',
  documentSuccessVersion: 0,
  documentDeleteSuccessVersion: 0
});

const emit = defineEmits<{
  lock: [];
  backHome: [];
  openModule: [moduleKey: ArchiveModuleKey];
  search: [keyword: string];
  savePassword: [payload: PasswordFormPayload];
  deletePassword: [id: string];
  saveDocument: [payload: DocumentFormPayload];
  deleteDocument: [id: string];
}>();

const keyword = ref('');
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
const loginMethodOptions = ['手机号', '邮箱', '微信', 'GitHub', '账号密码', '扫码登录'];
const passwordFormRules: FormRules<PasswordFormPayload> = {
  title: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};

const documentDrawerVisible = ref(false);
const documentDrawerMode = ref<'create' | 'edit' | 'view'>('create');
const documentFormError = ref('');
const documentSubmitAttempted = ref(false);
const documentContentLoading = ref(false);
const documentFormRef = ref<FormInstance>();
const documentForm = ref<DocumentFormPayload>({
  title: '',
  category: '',
  fileType: 'md',
  originalName: '',
  content: '',
  remark: ''
});
const documentCategoryOptions = ['项目文档', '技术笔记', '生活记录', '合同资料', '其他'];
const documentFileTypeOptions: Array<{ label: string; value: DocumentFileType }> = [
  { label: 'Markdown', value: 'md' },
  { label: 'TXT', value: 'txt' }
];
const documentFormRules: FormRules<DocumentFormPayload> = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
  fileType: [{ required: true, message: '请选择文档类型', trigger: 'change' }]
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
const isPasswordDialogReadonly = computed<boolean>(() => passwordDialogMode.value === 'view');
const isDocumentDrawerReadonly = computed<boolean>(() => documentDrawerMode.value === 'view');
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
const documentDrawerTitle = computed<string>(() => {
  if (documentDrawerMode.value === 'create') {
    return '新增文档';
  }

  if (documentDrawerMode.value === 'edit') {
    return '编辑文档';
  }

  return '查看文档';
});
const documentDrawerErrorMessage = computed<string>(() => {
  if (documentFormError.value) {
    return documentFormError.value;
  }

  return documentSubmitAttempted.value ? props.documentOperationError : '';
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
  if (isPasswordModule.value || isDocumentModule.value) {
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

const passwordGroups = computed<CategoryGroup<PasswordListItem>[]>(() => {
  return createCategoryGroups(passwordItems.value, (item) => item.category);
});

const documentGroups = computed<CategoryGroup<DocumentListItem>[]>(() => {
  return createCategoryGroups(documentItems.value, (item) => item.category);
});

const fileGroups = computed<CategoryGroup<FileAssetListItem>[]>(() => {
  return createCategoryGroups(fileItems.value, (item) => item.category);
});

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

  return `${(size / 1024).toFixed(1)} KB`;
};

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
 * 获取文档列表的辅助说明
 * @param item - 文档记录
 * @returns 文件名和更新时间组成的说明文本
 * @throws 不抛出异常
 */
const getDocumentSummaryText = (item: DocumentListItem): string => {
  const values = [item.originalName, item.updatedAt].filter((value): value is string => Boolean(value));
  return values.join(' · ');
};

const handleSearch = (): void => {
  emit('search', keyword.value);
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

const openCreateDocumentDrawer = (): void => {
  documentDrawerMode.value = 'create';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  documentForm.value = {
    title: '',
    category: '',
    fileType: 'md',
    originalName: '',
    content: '',
    remark: ''
  };
  documentDrawerVisible.value = true;
};

const fillDocumentForm = (item: DocumentListItem, content = ''): void => {
  documentForm.value = {
    id: item.id,
    title: item.title,
    category: item.category || '',
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

const openViewDocumentDrawer = async (item: DocumentListItem): Promise<void> => {
  documentDrawerMode.value = 'view';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  fillDocumentForm(item);
  documentDrawerVisible.value = true;
  await loadDocumentDetail(item);
};

const switchDocumentDrawerToEdit = (): void => {
  documentDrawerMode.value = 'edit';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
};

const closeDocumentDrawer = (): void => {
  documentDrawerVisible.value = false;
  documentSubmitAttempted.value = false;
  documentContentLoading.value = false;
};

const submitDocumentForm = async (): Promise<void> => {
  if (isDocumentDrawerReadonly.value || props.documentOperationLoading || documentContentLoading.value) {
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

watch(
  () => props.module.key,
  () => {
    passwordDialogVisible.value = false;
    documentDrawerVisible.value = false;
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
    if (documentDrawerVisible.value && !isDocumentDrawerReadonly.value) {
      closeDocumentDrawer();
    }
  }
);

watch(
  () => props.documentDeleteSuccessVersion,
  () => {
    if (documentDrawerVisible.value) {
      closeDocumentDrawer();
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

        <div class="module-detail__actions">
          <AppButton variant="ghost" @click="emit('backHome')">返回首页</AppButton>
          <AppButton variant="ghost" @click="emit('lock')">退出登录</AppButton>
        </div>
      </div>

      <nav class="module-detail__nav" aria-label="档案模块">
        <div class="module-detail__nav-track">
          <button
            v-for="moduleItem in ARCHIVE_MODULES"
            :key="moduleItem.key"
            class="module-detail__nav-item"
            :class="{ 'module-detail__nav-item--active': moduleItem.key === props.module.key }"
            type="button"
            @click="emit('openModule', moduleItem.key)"
          >
            <span class="module-detail__nav-dot" :class="`module-detail__nav-dot--${moduleItem.tone}`" />
            <span>{{ moduleItem.name }}</span>
            <span class="module-detail__nav-count">{{ moduleCounts[moduleItem.key] }}</span>
          </button>
        </div>
      </nav>
    </header>

    <main class="module-detail__main">
      <section class="module-detail__panel module-detail__panel--workspace">
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
              @click="openCreateDocumentDrawer"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              新增文档
            </AppButton>
          </div>
        </div>

        <div v-if="props.errorMessage" class="module-detail__empty module-detail__empty--error">
          {{ props.errorMessage }}
        </div>
        <div v-else-if="props.loading && props.items.length === 0" class="module-detail__empty">正在加载模块数据...</div>
        <div v-else-if="props.items.length === 0" class="module-detail__empty">暂无数据</div>

        <template v-else-if="isPasswordModule">
          <section
            v-for="group in passwordGroups"
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
          <section
            v-for="group in documentGroups"
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
                @click="openViewDocumentDrawer(item)"
              >
                <span class="module-detail__simple-icon module-detail__simple-icon--document" aria-hidden="true">
                  {{ item.fileType.toUpperCase() }}
                </span>

                <span class="module-detail__simple-main">
                  <span class="module-detail__simple-title">{{ item.title }}</span>
                  <span class="module-detail__simple-meta">{{ getDocumentSummaryText(item) }}</span>
                </span>

                <span class="module-detail__simple-count">{{ formatSize(item.size) }}</span>
                <el-icon class="module-detail__simple-arrow"><ArrowRight /></el-icon>
              </button>
            </TransitionGroup>
          </section>
        </template>

        <template v-else>
          <section
            v-for="group in fileGroups"
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
              </article>
            </TransitionGroup>
          </section>
        </template>
      </section>
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
          >
            <el-option
              v-for="method in loginMethodOptions"
              :key="method"
              :label="method"
              :value="method"
            />
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

    <el-drawer
      v-model="documentDrawerVisible"
      class="module-detail__element-drawer"
      direction="rtl"
      size="450px"
      :close-on-click-modal="!props.documentOperationLoading"
      :close-on-press-escape="!props.documentOperationLoading"
      :show-close="false"
      :lock-scroll="false"
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Document</p>
            <h2 class="module-detail__drawer-title">{{ documentDrawerTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭抽屉" @click="closeDocumentDrawer">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="documentFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element"
        :class="{ 'module-detail__drawer-form--readonly': isDocumentDrawerReadonly }"
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
            :readonly="isDocumentDrawerReadonly"
            :clearable="!isDocumentDrawerReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-input
            v-if="isDocumentDrawerReadonly"
            v-model="documentForm.category"
            readonly
          />
          <el-select
            v-else
            v-model="documentForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option
              v-for="category in documentCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="文档类型" prop="fileType">
          <el-input
            v-if="isDocumentDrawerReadonly"
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
            :readonly="isDocumentDrawerReadonly"
            :clearable="!isDocumentDrawerReadonly"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="内容" prop="content">
          <el-input
            v-model="documentForm.content"
            class="module-detail__document-editor"
            :placeholder="documentContentLoading ? '正在加载文档内容...' : '在这里编写 Markdown 或 TXT 内容'"
            type="textarea"
            :autosize="{ minRows: 12, maxRows: 18 }"
            :readonly="isDocumentDrawerReadonly"
            :disabled="documentContentLoading"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="documentForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :readonly="isDocumentDrawerReadonly"
          />
        </el-form-item>

        <el-alert
          v-if="documentDrawerErrorMessage"
          class="module-detail__drawer-alert"
          :title="documentDrawerErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button
            v-if="isDocumentDrawerReadonly && documentForm.id"
            type="danger"
            text
            :loading="props.documentOperationLoading"
            @click="confirmDeleteDocument"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button v-if="isDocumentDrawerReadonly" type="primary" text @click="switchDocumentDrawerToEdit">
            <el-icon><EditPen /></el-icon>
            编辑
          </el-button>
          <el-button @click="closeDocumentDrawer">{{ isDocumentDrawerReadonly ? '关闭' : '取消' }}</el-button>
          <el-button
            v-if="!isDocumentDrawerReadonly"
            type="primary"
            :loading="props.documentOperationLoading || documentContentLoading"
            @click="submitDocumentForm"
          >
            {{ documentDrawerMode === 'create' ? '新增' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
