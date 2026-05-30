<script setup lang="ts">
/**
 * @component ModuleDetailShell
 * @description 个人档案模块详情页布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { computed, ref, watch } from 'vue';
import {
  Close,
  Delete,
  EditPen,
  Hide,
  Link,
  Plus,
  View
} from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElLink,
  ElOption,
  ElPagination,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  type FormInstance,
  type FormRules
} from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
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
  /** 类型：DashboardSummaryData；含义：左侧模块统计；是否必填：是；默认值：无 */
  summary: DashboardSummaryData;
  /** 类型：PasswordListItem[] 或 FileAssetListItem[]；含义：模块列表；是否必填：是；默认值：空数组 */
  items: PasswordListItem[] | DocumentListItem[] | FileAssetListItem[];
  /** 类型：布尔值；含义：模块数据是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：模块加载错误提示；是否必填：否；默认值：空字符串 */
  errorMessage?: string;
  /** 类型：布尔值；含义：密码增删改操作是否执行中；是否必填：否；默认值：false */
  passwordOperationLoading?: boolean;
  /** 类型：字符串；含义：密码抽屉内操作错误提示；是否必填：否；默认值：空字符串 */
  passwordOperationError?: string;
  /** 类型：数字；含义：密码保存成功信号；是否必填：否；默认值：0 */
  passwordSuccessVersion?: number;
  /** 类型：布尔值；含义：文档增删改操作是否执行中；是否必填：否；默认值：false */
  documentOperationLoading?: boolean;
  /** 类型：字符串；含义：文档抽屉内操作错误提示；是否必填：否；默认值：空字符串 */
  documentOperationError?: string;
  /** 类型：数字；含义：文档保存成功信号；是否必填：否；默认值：0 */
  documentSuccessVersion?: number;
}

const props = withDefaults(defineProps<ModuleDetailShellProps>(), {
  errorMessage: '',
  passwordOperationLoading: false,
  passwordOperationError: '',
  passwordSuccessVersion: 0,
  documentOperationLoading: false,
  documentOperationError: '',
  documentSuccessVersion: 0
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
const visiblePasswordIds = ref<Record<string, boolean>>({});
const passwordCurrentPage = ref(1);
const passwordPageSize = ref(5);
const passwordDrawerVisible = ref(false);
const passwordDrawerMode = ref<'create' | 'edit' | 'view'>('create');
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
const passwordCategoryOptions = ['阿里系', '腾讯系', '谷歌系', '开发平台', '社交媒体', '其他'];
const loginMethodOptions = ['手机号', '邮箱', '微信', 'GitHub', '账号密码', '扫码登录'];
const passwordFormRules: FormRules<PasswordFormPayload> = {
  title: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};

const documentCurrentPage = ref(1);
const documentPageSize = ref(5);
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
const isPasswordDrawerReadonly = computed<boolean>(() => passwordDrawerMode.value === 'view');
const isDocumentDrawerReadonly = computed<boolean>(() => documentDrawerMode.value === 'view');
const passwordDrawerTitle = computed<string>(() => {
  if (passwordDrawerMode.value === 'create') {
    return '新增密码';
  }

  if (passwordDrawerMode.value === 'edit') {
    return '编辑密码';
  }

  return '查看密码';
});
const passwordDrawerErrorMessage = computed<string>(() => {
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

const passwordTotalPages = computed<number>(() => {
  return Math.max(1, Math.ceil(passwordItems.value.length / passwordPageSize.value));
});

const paginatedPasswordItems = computed<PasswordListItem[]>(() => {
  const startIndex = (passwordCurrentPage.value - 1) * passwordPageSize.value;
  return passwordItems.value.slice(startIndex, startIndex + passwordPageSize.value);
});

const documentItems = computed<DocumentListItem[]>(() => {
  if (!isDocumentModule.value) {
    return [];
  }

  return props.items as DocumentListItem[];
});

const documentTotalPages = computed<number>(() => {
  return Math.max(1, Math.ceil(documentItems.value.length / documentPageSize.value));
});

const paginatedDocumentItems = computed<DocumentListItem[]>(() => {
  const startIndex = (documentCurrentPage.value - 1) * documentPageSize.value;
  return documentItems.value.slice(startIndex, startIndex + documentPageSize.value);
});

const fileItems = computed<FileAssetListItem[]>(() => {
  if (isPasswordModule.value || isDocumentModule.value) {
    return [];
  }

  return props.items as FileAssetListItem[];
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
 * 掩码显示密码
 * @param password - 明文密码
 * @returns 掩码后的密码文本
 * @throws 不抛出异常
 */
const maskPassword = (password: string | null): string => {
  if (!password) {
    return '-';
  }

  return '********';
};

const handleSearch = (): void => {
  passwordCurrentPage.value = 1;
  documentCurrentPage.value = 1;
  emit('search', keyword.value);
};

const openCreatePasswordDrawer = (): void => {
  passwordDrawerMode.value = 'create';
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
  passwordDrawerVisible.value = true;
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

const openEditPasswordDrawer = (item: PasswordListItem): void => {
  passwordDrawerMode.value = 'edit';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  fillPasswordForm(item);
  passwordDrawerVisible.value = true;
};

const openViewPasswordDrawer = (item: PasswordListItem): void => {
  passwordDrawerMode.value = 'view';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  fillPasswordForm(item);
  passwordDrawerVisible.value = true;
};

const closePasswordDrawer = (): void => {
  passwordDrawerVisible.value = false;
  passwordSubmitAttempted.value = false;
};

const submitPasswordForm = async (): Promise<void> => {
  if (isPasswordDrawerReadonly.value || props.passwordOperationLoading) {
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

const togglePasswordVisible = (id: string): void => {
  visiblePasswordIds.value = {
    ...visiblePasswordIds.value,
    [id]: !visiblePasswordIds.value[id]
  };
};

const getPasswordDisplayText = (item: PasswordListItem): string => {
  if (visiblePasswordIds.value[item.id]) {
    return item.password || '-';
  }

  return maskPassword(item.password);
};

const getBindingText = (item: PasswordListItem): string => {
  const values = [item.phone, item.email].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(' / ') : '-';
};

const getLoginUrlHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '打开链接';
  }
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

const openEditDocumentDrawer = async (item: DocumentListItem): Promise<void> => {
  documentDrawerMode.value = 'edit';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  fillDocumentForm(item);
  documentDrawerVisible.value = true;
  await loadDocumentDetail(item);
};

const openViewDocumentDrawer = async (item: DocumentListItem): Promise<void> => {
  documentDrawerMode.value = 'view';
  documentFormError.value = '';
  documentSubmitAttempted.value = false;
  fillDocumentForm(item);
  documentDrawerVisible.value = true;
  await loadDocumentDetail(item);
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

watch(
  () => props.module.key,
  () => {
    passwordDrawerVisible.value = false;
    documentDrawerVisible.value = false;
    passwordCurrentPage.value = 1;
    documentCurrentPage.value = 1;
  }
);

watch(
  () => props.items.length,
  () => {
    passwordCurrentPage.value = 1;
    documentCurrentPage.value = 1;
  }
);

watch(
  passwordTotalPages,
  (totalPages) => {
    if (passwordCurrentPage.value > totalPages) {
      passwordCurrentPage.value = totalPages;
    }
  }
);

watch(
  documentTotalPages,
  (totalPages) => {
    if (documentCurrentPage.value > totalPages) {
      documentCurrentPage.value = totalPages;
    }
  }
);

watch(
  () => props.passwordSuccessVersion,
  () => {
    if (passwordDrawerVisible.value && !isPasswordDrawerReadonly.value) {
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
</script>

<template>
  <div class="module-detail">
    <aside class="module-detail__sidebar">
      <button class="module-detail__brand" type="button" @click="emit('backHome')">
        <span class="module-detail__brand-mark">A</span>
        <span>
          <span class="module-detail__brand-en">{{ APP_ENGLISH_NAME }}</span>
          <strong class="module-detail__brand-name">{{ APP_NAME }}</strong>
        </span>
      </button>

      <nav class="module-detail__nav" aria-label="档案模块">
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
      </nav>
    </aside>

    <main class="module-detail__main">
      <header class="module-detail__topbar">
        <div class="module-detail__breadcrumb">
          <button class="module-detail__breadcrumb-link" type="button" @click="emit('backHome')">
            个人档案
          </button>
          <span class="module-detail__breadcrumb-separator">/</span>
          <strong class="module-detail__breadcrumb-current">{{ props.module.name }}</strong>
        </div>
        <div class="module-detail__actions">
          <AppButton variant="ghost" @click="emit('backHome')">返回首页</AppButton>
          <AppButton variant="ghost" @click="emit('lock')">退出登录</AppButton>
        </div>
      </header>

      <Transition name="archive-module-content" mode="out-in">
      <section :key="props.module.key" class="module-detail__panel module-detail__panel--workspace">
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
          <div class="module-detail__table-wrap module-detail__table-wrap--element">
            <el-table
              class="module-detail__element-table"
              :data="paginatedPasswordItems"
              border
              :fit="false"
              stripe
              size="large"
            >
              <el-table-column prop="title" label="平台" width="220" fixed="left">
                <template #default="{ row }: { row: PasswordListItem }">
                  <div class="module-detail__platform-cell">
                    <span class="module-detail__platform-title">{{ row.title }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="category" label="分类" width="120">
              <template #default="{ row }: { row: PasswordListItem }">
                <el-tag effect="plain" round>{{ row.category }}</el-tag>
              </template>
              </el-table-column>

              <el-table-column prop="loginUrl" label="登录网址" width="220" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                <el-link
                  v-if="row.loginUrl"
                  type="primary"
                  :href="row.loginUrl"
                  target="_blank"
                  :underline="false"
                >
                  <el-icon><Link /></el-icon>
                  {{ row.loginUrl }}
                </el-link>
                <span v-else>-</span>
              </template>
              </el-table-column>

              <el-table-column prop="loginMethod" label="登录方式" width="130">
              <template #default="{ row }: { row: PasswordListItem }">
                {{ row.loginMethod || '-' }}
              </template>
              </el-table-column>

              <el-table-column prop="account" label="账号" width="210" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                {{ row.account || '-' }}
              </template>
              </el-table-column>

              <el-table-column prop="password" label="密码" width="170">
              <template #default="{ row }: { row: PasswordListItem }">
                <span class="module-detail__password-cell">
                  <code>{{ getPasswordDisplayText(row) }}</code>
                  <el-tooltip :content="visiblePasswordIds[row.id] ? '隐藏密码' : '查看密码'" placement="top">
                    <el-button
                      circle
                      size="small"
                      text
                      :aria-label="visiblePasswordIds[row.id] ? '隐藏密码' : '查看密码'"
                      @click="togglePasswordVisible(row.id)"
                    >
                      <el-icon>
                        <View v-if="!visiblePasswordIds[row.id]" />
                        <Hide v-else />
                      </el-icon>
                    </el-button>
                  </el-tooltip>
                </span>
              </template>
              </el-table-column>

              <el-table-column label="绑定信息" width="220" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                {{ getBindingText(row) }}
              </template>
              </el-table-column>

              <el-table-column prop="remark" label="备注" width="220" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                {{ row.remark || '-' }}
              </template>
              </el-table-column>

              <el-table-column label="操作" width="210" fixed="right" align="left" header-align="left">
              <template #default="{ row }: { row: PasswordListItem }">
                <div class="module-detail__element-actions">
                  <el-button text type="primary" @click="openViewPasswordDrawer(row)">
                    查看
                  </el-button>
                  <el-button text type="primary" :icon="EditPen" @click="openEditPasswordDrawer(row)">
                    编辑
                  </el-button>
                  <el-popconfirm
                    width="220"
                    title="确认删除这条密码记录？"
                    confirm-button-text="删除"
                    cancel-button-text="取消"
                    confirm-button-type="danger"
                    @confirm="requestDeletePassword(row.id)"
                  >
                    <template #reference>
                      <el-button
                        text
                        type="danger"
                        :icon="Delete"
                        :loading="props.passwordOperationLoading"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="module-detail__pagination">
            <el-pagination
              v-model:current-page="passwordCurrentPage"
              v-model:page-size="passwordPageSize"
              :page-sizes="[5, 10, 20, 50]"
              :total="passwordItems.length"
              background
              layout="total, sizes, prev, pager, next"
            />
          </div>
        </template>

        <template v-else-if="isDocumentModule">
          <div class="module-detail__table-wrap module-detail__table-wrap--element">
            <el-table
              class="module-detail__element-table"
              :data="paginatedDocumentItems"
              border
              :fit="false"
              stripe
              size="large"
            >
              <el-table-column prop="title" label="文档标题" width="220" fixed="left" show-overflow-tooltip />
              <el-table-column prop="category" label="分类" width="120">
                <template #default="{ row }: { row: DocumentListItem }">
                  <el-tag effect="plain" round>{{ row.category || '未分类' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="fileType" label="类型" width="100">
                <template #default="{ row }: { row: DocumentListItem }">
                  <el-tag effect="plain" round>{{ row.fileType.toUpperCase() }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="originalName" label="文件名" width="190" show-overflow-tooltip />
              <el-table-column prop="size" label="大小" width="100">
                <template #default="{ row }: { row: DocumentListItem }">
                  {{ formatSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" width="220" show-overflow-tooltip>
                <template #default="{ row }: { row: DocumentListItem }">
                  {{ row.remark || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="updatedAt" label="更新时间" width="170" show-overflow-tooltip />
              <el-table-column label="操作" width="210" fixed="right" align="left" header-align="left">
                <template #default="{ row }: { row: DocumentListItem }">
                  <div class="module-detail__element-actions">
                    <el-button text type="primary" @click="openViewDocumentDrawer(row)">
                      查看
                    </el-button>
                    <el-button text type="primary" :icon="EditPen" @click="openEditDocumentDrawer(row)">
                      编辑
                    </el-button>
                    <el-popconfirm
                      width="220"
                      title="确认删除这篇文档？"
                      confirm-button-text="删除"
                      cancel-button-text="取消"
                      confirm-button-type="danger"
                      @confirm="requestDeleteDocument(row.id)"
                    >
                      <template #reference>
                        <el-button
                          text
                          type="danger"
                          :icon="Delete"
                          :loading="props.documentOperationLoading"
                        >
                          删除
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="module-detail__pagination">
            <el-pagination
              v-model:current-page="documentCurrentPage"
              v-model:page-size="documentPageSize"
              :page-sizes="[5, 10, 20, 50]"
              :total="documentItems.length"
              background
              layout="total, sizes, prev, pager, next"
            />
          </div>
        </template>

        <TransitionGroup v-else name="archive-row" tag="div" class="module-detail__file-list">
          <article v-for="item in fileItems" :key="item.id" class="module-detail__file-row">
            <div class="module-detail__file-type">
              <span class="module-detail__file-extension">{{ item.originalName.split('.').pop() || 'file' }}</span>
              <span class="module-detail__file-category">{{ item.category || '未分类' }}</span>
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
      </Transition>
    </main>

    <el-drawer
      v-model="passwordDrawerVisible"
      class="module-detail__element-drawer"
      direction="rtl"
      size="450px"
      :close-on-click-modal="!props.passwordOperationLoading"
      :close-on-press-escape="!props.passwordOperationLoading"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Password</p>
            <h2 class="module-detail__drawer-title">{{ passwordDrawerTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭抽屉" @click="closePasswordDrawer">
            <el-icon><Close /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="passwordFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element"
        :model="passwordForm"
        :rules="passwordFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitPasswordForm"
      >
        <el-form-item class="module-detail__drawer-item" label="平台名称" prop="title">
          <el-input v-model="passwordForm.title" placeholder="例如：阿里云控制台" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-select
            v-model="passwordForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            :disabled="isPasswordDrawerReadonly"
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
          <el-input v-model="passwordForm.loginUrl" placeholder="https://example.com" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录方式" prop="loginMethod">
          <el-select
            v-model="passwordForm.loginMethod"
            placeholder="选择或输入登录方式"
            filterable
            allow-create
            default-first-option
            :disabled="isPasswordDrawerReadonly"
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
          <el-input v-model="passwordForm.account" placeholder="账号、手机号、邮箱或微信号" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="登录密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            placeholder="明文保存，仅个人查看"
            :disabled="isPasswordDrawerReadonly"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="绑定手机号" prop="phone">
          <el-input v-model="passwordForm.phone" placeholder="可选" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="绑定邮箱" prop="email">
          <el-input v-model="passwordForm.email" placeholder="可选" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="passwordForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="isPasswordDrawerReadonly"
          />
        </el-form-item>

        <el-alert
          v-if="passwordDrawerErrorMessage"
          class="module-detail__drawer-alert"
          :title="passwordDrawerErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button @click="closePasswordDrawer">取消</el-button>
          <el-button
            v-if="!isPasswordDrawerReadonly"
            type="primary"
            :loading="props.passwordOperationLoading"
            @click="submitPasswordForm"
          >
            {{ passwordDrawerMode === 'create' ? '新增' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer
      v-model="documentDrawerVisible"
      class="module-detail__element-drawer"
      direction="rtl"
      size="450px"
      :close-on-click-modal="!props.documentOperationLoading"
      :close-on-press-escape="!props.documentOperationLoading"
      :show-close="false"
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
        :model="documentForm"
        :rules="documentFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitDocumentForm"
      >
        <el-form-item class="module-detail__drawer-item" label="文档标题" prop="title">
          <el-input v-model="documentForm.title" placeholder="例如：部署笔记" :disabled="isDocumentDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item" label="分类" prop="category">
          <el-select
            v-model="documentForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            :disabled="isDocumentDrawerReadonly"
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
          <el-select v-model="documentForm.fileType" :disabled="isDocumentDrawerReadonly">
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
            :disabled="isDocumentDrawerReadonly"
            clearable
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="内容" prop="content">
          <el-input
            v-model="documentForm.content"
            class="module-detail__document-editor"
            :placeholder="documentContentLoading ? '正在加载文档内容...' : '在这里编写 Markdown 或 TXT 内容'"
            type="textarea"
            :autosize="{ minRows: 12, maxRows: 18 }"
            :disabled="isDocumentDrawerReadonly || documentContentLoading"
          />
        </el-form-item>

        <el-form-item class="module-detail__drawer-item module-detail__drawer-item--full" label="备注" prop="remark">
          <el-input
            v-model="documentForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="isDocumentDrawerReadonly"
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
          <el-button @click="closeDocumentDrawer">取消</el-button>
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
