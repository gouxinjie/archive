<script setup lang="ts">
/**
 * @component ModulePage
 * @description 个人档案模块详情页
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-06-02
 */

import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ArchivePageLoading from '~/components/commons/ArchivePageLoading/index.vue';
import EntryGate from '~/components/business/EntryGate/index.vue';
import ModuleDetailShell from '~/components/business/ModuleDetailShell/index.vue';
import { useArchiveSession } from '~/composables/useArchiveSession';
import { ARCHIVE_MODULES } from '~/constants/app';
import type { ApiResponse, DashboardSummaryData } from '~/types/api';
import type {
  ArchiveModuleConfig,
  ArchiveModuleKey,
  DocumentFormPayload,
  DocumentListItem,
  FileAssetFormPayload,
  FileAssetListItem,
  ImageFormPayload,
  ModuleDetailData,
  PasswordFormPayload,
  PasswordListItem,
  ResumeFormPayload
} from '~/types/models';
import { request, uploadRequest } from '~/utils/request';

definePageMeta({
  pageTransition: false
});

const route = useRoute();
const session = useArchiveSession();
const createEmptySummary = (): DashboardSummaryData => ({
  passwordCount: 0,
  documentCount: 0,
  resumeCount: 0,
  imageCount: 0,
  certificateCount: 0,
  studyCount: 0
});

const summary = useState<DashboardSummaryData>('archive-module-summary', createEmptySummary);
const summaryLoaded = useState<boolean>('archive-module-summary-loaded', () => false);
const summaryLoading = useState<boolean>('archive-module-summary-loading', () => false);
const summaryProfileId = useState<string | null>('archive-module-summary-profile-id', () => null);
const moduleData = useState<ModuleDetailData | null>('archive-module-data', () => null);
const moduleDataProfileId = useState<string | null>('archive-module-data-profile-id', () => null);
const loading = ref(false);
const moduleError = ref('');
const currentKeyword = ref('');
const passwordOperationLoading = ref(false);
const passwordOperationError = ref('');
const passwordSuccessVersion = ref(0);
const passwordDeleteSuccessVersion = ref(0);
const documentOperationLoading = ref(false);
const documentOperationError = ref('');
const documentSuccessVersion = ref(0);
const documentDeleteSuccessVersion = ref(0);
const resumeOperationLoading = ref(false);
const resumeOperationError = ref('');
const resumeSuccessVersion = ref(0);
const resumeDeleteSuccessVersion = ref(0);
const imageOperationLoading = ref(false);
const imageOperationError = ref('');
const imageSuccessVersion = ref(0);
const imageDeleteSuccessVersion = ref(0);
const fileOperationLoading = ref(false);
const fileOperationError = ref('');
const fileSuccessVersion = ref(0);
const fileDeleteSuccessVersion = ref(0);
let moduleRequestSerial = 0;
const activeModuleLoadSignature = useState<string>('archive-module-active-load-signature', () => '');

const currentProfileId = computed<string | null>(() => session.status.value.userId || session.status.value.profileId || null);
const isReadOnlySession = computed<boolean>(() => Boolean(session.status.value.readOnly));
const readOnlyMessage = computed<string>(() => {
  return session.status.value.readOnlyMessage || '演示账号仅支持查看，不支持新增、编辑、上传、删除或下载。';
});
const currentUserName = computed<string>(() => {
  return (
    session.status.value.displayName ||
    session.status.value.profileName ||
    session.status.value.username ||
    session.status.value.userId ||
    'Archive'
  );
});

const moduleKey = computed<ArchiveModuleKey | null>(() => {
  const value = route.params.module;
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const found = ARCHIVE_MODULES.find((item) => item.key === normalizedValue);
  return found?.key || null;
});

const hasFreshModuleData = computed<boolean>(() => {
  return Boolean(
    moduleDataProfileId.value === currentProfileId.value &&
    moduleData.value?.module.key === moduleKey.value
  );
});
const canKeepPreviousModuleData = computed<boolean>(() => {
  return Boolean(
    loading.value &&
    moduleDataProfileId.value === currentProfileId.value &&
    moduleData.value?.module.key === moduleKey.value
  );
});

const fallbackModule = computed<ArchiveModuleConfig>(() => {
  return ARCHIVE_MODULES.find((item) => item.key === moduleKey.value) || ARCHIVE_MODULES[0]!;
});

const currentModule = computed<ArchiveModuleConfig>(() => {
  const data = moduleData.value;

  if (data && (hasFreshModuleData.value || canKeepPreviousModuleData.value)) {
    return data.module;
  }

  return fallbackModule.value;
});

const currentItems = computed<PasswordListItem[] | DocumentListItem[] | FileAssetListItem[]>(() => {
  const data = moduleData.value;

  if (data && (hasFreshModuleData.value || canKeepPreviousModuleData.value)) {
    return data.items;
  }

  return [];
});

const blockReadOnlyAction = (): boolean => {
  if (!isReadOnlySession.value) {
    return false;
  }

  ElMessage.warning(readOnlyMessage.value);
  return true;
};

/**
 * 加载左侧模块统计
 * @returns 无返回值
 * @throws 请求异常会向上抛出
 */
const loadSummary = async (): Promise<void> => {
  if (summaryLoading.value) {
    return;
  }

  const targetProfileId = currentProfileId.value;

  if (!targetProfileId) {
    return;
  }

  summaryLoading.value = true;

  try {
    const response = await request<DashboardSummaryData>('/api/dashboard/summary');

    if (response.success && currentProfileId.value === targetProfileId) {
      summary.value = response.data;
      summaryLoaded.value = true;
      summaryProfileId.value = targetProfileId;
    }
  } finally {
    summaryLoading.value = false;
  }
};

/**
 * 加载当前模块列表
 * @param keyword - 搜索关键词
 * @returns 无返回值
 * @throws 请求异常会向上抛出
 */
const loadModuleData = async (keyword = currentKeyword.value): Promise<void> => {
  const targetModuleKey = moduleKey.value;

  if (!targetModuleKey) {
    moduleData.value = null;
    moduleDataProfileId.value = null;
    return;
  }

  const targetProfileId = currentProfileId.value;

  if (!targetProfileId) {
    return;
  }

  const loadSignature = `${targetProfileId}::${targetModuleKey}::${keyword.trim()}`;

  if (activeModuleLoadSignature.value === loadSignature) {
    return;
  }

  activeModuleLoadSignature.value = loadSignature;
  const requestSerial = moduleRequestSerial + 1;
  moduleRequestSerial = requestSerial;
  currentKeyword.value = keyword;
  moduleError.value = '';
  loading.value = true;

  try {
    const response = await request<ModuleDetailData>(`/api/modules/${targetModuleKey}`, {
      query: { keyword }
    });

    if (requestSerial !== moduleRequestSerial || moduleKey.value !== targetModuleKey || currentProfileId.value !== targetProfileId) {
      return;
    }

    if (response.success) {
      moduleData.value = response.data;
      moduleDataProfileId.value = targetProfileId;
      return;
    }

    moduleError.value = response.message;
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '获取模块数据失败';
    console.error(moduleError.value);
  } finally {
    if (requestSerial === moduleRequestSerial) {
      loading.value = false;
    }

    if (activeModuleLoadSignature.value === loadSignature) {
      activeModuleLoadSignature.value = '';
    }
  }
};

/**
 * 加载模块页所需数据
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const loadPageData = async (keyword = currentKeyword.value, refreshSummary = false): Promise<void> => {
  if (!session.authenticated.value || !currentProfileId.value) {
    return;
  }

  if (refreshSummary || !summaryLoaded.value || summaryProfileId.value !== currentProfileId.value) {
    await Promise.all([loadSummary(), loadModuleData(keyword)]);
    return;
  }

  await loadModuleData(keyword);
};

const resetArchiveModuleCache = (): void => {
  summary.value = createEmptySummary();
  summaryLoaded.value = false;
  summaryProfileId.value = null;
  moduleData.value = null;
  moduleDataProfileId.value = null;
  activeModuleLoadSignature.value = '';
};

const handleLogin = async (username: string, password: string): Promise<void> => {
  await session.login(username, password);
};

const handleLock = async (): Promise<void> => {
  await session.lock();
  await navigateTo('/');
};

const handleBackHome = async (): Promise<void> => {
  await navigateTo('/');
};

const handleOpenModule = async (targetModuleKey: ArchiveModuleKey): Promise<void> => {
  if (targetModuleKey !== moduleKey.value) {
    loading.value = true;
  }

  await navigateTo(`/modules/${targetModuleKey}`);
};

const handleSavePassword = async (payload: PasswordFormPayload): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  passwordOperationLoading.value = true;
  passwordOperationError.value = '';
  moduleError.value = '';
  const successMessage = payload.id ? '密码保存成功' : '密码新增成功';

  try {
    const response = await request<{ id: string }>(
      payload.id ? `/api/passwords/${payload.id}` : '/api/passwords',
      {
        method: payload.id ? 'PUT' : 'POST',
        body: {
          title: payload.title,
          category: payload.category,
          loginUrl: payload.loginUrl,
          loginMethod: payload.loginMethod,
          account: payload.account,
          password: payload.password,
          phone: payload.phone,
          email: payload.email,
          remark: payload.remark
        }
      }
    );

    if (!response.success) {
      passwordOperationError.value = response.message;
      return;
    }

    passwordSuccessVersion.value += 1;
    ElMessage.success(successMessage);
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    passwordOperationError.value = error instanceof Error ? error.message : '密码记录保存失败';
    console.error(passwordOperationError.value);
  } finally {
    passwordOperationLoading.value = false;
  }
};

const handleDeletePassword = async (id: string): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  passwordOperationLoading.value = true;
  passwordOperationError.value = '';
  moduleError.value = '';

  try {
    const response = await request<{ id: string }>(`/api/passwords/${id}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      moduleError.value = response.message;
      return;
    }

    passwordDeleteSuccessVersion.value += 1;
    ElMessage.success('密码删除成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '密码记录删除失败';
    console.error(moduleError.value);
  } finally {
    passwordOperationLoading.value = false;
  }
};

const handleSaveDocument = async (payload: DocumentFormPayload): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  documentOperationLoading.value = true;
  documentOperationError.value = '';
  moduleError.value = '';
  const successMessage = payload.id ? '文档保存成功' : '文档新增成功';

  try {
    const response = await request<{ id: string }>(
      payload.id ? `/api/documents/${payload.id}` : '/api/documents',
      {
        method: payload.id ? 'PUT' : 'POST',
        body: {
          title: payload.title,
          category: payload.category,
          fileType: payload.fileType,
          originalName: payload.originalName,
          content: payload.content,
          remark: payload.remark
        }
      }
    );

    if (!response.success) {
      documentOperationError.value = response.message;
      return;
    }

    documentSuccessVersion.value += 1;
    ElMessage.success(successMessage);
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    documentOperationError.value = error instanceof Error ? error.message : '文档保存失败';
    console.error(documentOperationError.value);
  } finally {
    documentOperationLoading.value = false;
  }
};

const handleDeleteDocument = async (id: string): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  documentOperationLoading.value = true;
  documentOperationError.value = '';
  moduleError.value = '';

  try {
    const response = await request<{ id: string }>(`/api/documents/${id}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      moduleError.value = response.message;
      return;
    }

    documentDeleteSuccessVersion.value += 1;
    ElMessage.success('文档删除成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '文档删除失败';
    console.error(moduleError.value);
  } finally {
    documentOperationLoading.value = false;
  }
};

const handleSaveResume = async (payload: ResumeFormPayload): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  resumeOperationLoading.value = true;
  resumeOperationError.value = '';
  moduleError.value = '';

  try {
    let response: ApiResponse<{ id: string }>;

    if (payload.id) {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);

      if (payload.file) {
        formData.append('file', payload.file, payload.file.name);
      }

      response = await uploadRequest<{ id: string }>(`/api/resumes/${payload.id}`, formData, {
        method: 'PUT'
      });
    } else {
      if (!payload.file) {
        throw new Error('请先选择 docx 或 pdf 简历文件');
      }

      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);
      formData.append('file', payload.file, payload.file.name);
      response = await uploadRequest<{ id: string }>('/api/resumes', formData);
    }

    if (!response.success) {
      resumeOperationError.value = response.message;
      return;
    }

    resumeSuccessVersion.value += 1;
    ElMessage.success(payload.id ? '简历信息保存成功' : '简历上传成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    resumeOperationError.value = error instanceof Error ? error.message : '简历保存失败';
    console.error(resumeOperationError.value);
  } finally {
    resumeOperationLoading.value = false;
  }
};

const handleDeleteResume = async (id: string): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  resumeOperationLoading.value = true;
  resumeOperationError.value = '';
  moduleError.value = '';

  try {
    const response = await request<{ id: string }>(`/api/resumes/${id}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      moduleError.value = response.message;
      return;
    }

    resumeDeleteSuccessVersion.value += 1;
    ElMessage.success('简历删除成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '简历删除失败';
    console.error(moduleError.value);
  } finally {
    resumeOperationLoading.value = false;
  }
};

const handleSaveImage = async (payload: ImageFormPayload): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  imageOperationLoading.value = true;
  imageOperationError.value = '';
  moduleError.value = '';

  try {
    let response: ApiResponse<{ id: string }>;

    if (payload.id) {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);

      if (payload.file) {
        formData.append('file', payload.file, payload.file.name);
      }

      response = await uploadRequest<{ id: string }>(`/api/images/${payload.id}`, formData, {
        method: 'PUT'
      });
    } else {
      if (!payload.file) {
        throw new Error('请先选择需要上传的图片');
      }

      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);
      formData.append('file', payload.file, payload.file.name);
      response = await uploadRequest<{ id: string }>('/api/images', formData);
    }

    if (!response.success) {
      imageOperationError.value = response.message;
      return;
    }

    imageSuccessVersion.value += 1;
    ElMessage.success(payload.id ? '图片信息保存成功' : '图片上传成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    imageOperationError.value = error instanceof Error ? error.message : '图片保存失败';
    console.error(imageOperationError.value);
  } finally {
    imageOperationLoading.value = false;
  }
};

const handleDeleteImage = async (id: string): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  imageOperationLoading.value = true;
  imageOperationError.value = '';
  moduleError.value = '';

  try {
    const response = await request<{ id: string }>(`/api/images/${id}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      moduleError.value = response.message;
      return;
    }

    imageDeleteSuccessVersion.value += 1;
    ElMessage.success('图片删除成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '图片删除失败';
    console.error(moduleError.value);
  } finally {
    imageOperationLoading.value = false;
  }
};

const handleSaveFile = async (payload: FileAssetFormPayload): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  fileOperationLoading.value = true;
  fileOperationError.value = '';
  moduleError.value = '';

  try {
    let response: ApiResponse<{ id: string }>;

    if (payload.id) {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);

      if (payload.file) {
        formData.append('file', payload.file, payload.file.name);
      }

      response = await uploadRequest<{ id: string }>(`/api/files/${payload.module}/${payload.id}`, formData, {
        method: 'PUT'
      });
    } else {
      if (!payload.file) {
        throw new Error('请先选择需要上传的文件');
      }

      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('category', payload.category);
      formData.append('remark', payload.remark);
      formData.append('file', payload.file, payload.file.name);
      response = await uploadRequest<{ id: string }>(`/api/files/${payload.module}`, formData);
    }

    if (!response.success) {
      fileOperationError.value = response.message;
      return;
    }

    fileSuccessVersion.value += 1;
    ElMessage.success(payload.id ? '文件信息保存成功' : '文件上传成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    fileOperationError.value = error instanceof Error ? error.message : '文件保存失败';
    console.error(fileOperationError.value);
  } finally {
    fileOperationLoading.value = false;
  }
};

const handleDeleteFile = async (payload: { module: ArchiveModuleKey; id: string }): Promise<void> => {
  if (blockReadOnlyAction()) {
    return;
  }

  fileOperationLoading.value = true;
  fileOperationError.value = '';
  moduleError.value = '';

  try {
    const response = await request<{ id: string }>(`/api/files/${payload.module}/${payload.id}`, {
      method: 'DELETE'
    });

    if (!response.success) {
      moduleError.value = response.message;
      return;
    }

    fileDeleteSuccessVersion.value += 1;
    ElMessage.success('文件删除成功');
    await loadPageData(currentKeyword.value, true);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '文件删除失败';
    console.error(moduleError.value);
  } finally {
    fileOperationLoading.value = false;
  }
};

onMounted(async () => {
  if (!session.initialized.value) {
    await session.loadStatus();
  }
});

watch(
  [() => session.initialized.value, () => session.authenticated.value, currentProfileId, moduleKey],
  async ([initialized, authenticated, profileId, currentModuleKey]) => {
    if (!initialized || !authenticated || !profileId || !currentModuleKey) {
      return;
    }

    if (summaryProfileId.value && summaryProfileId.value !== profileId) {
      resetArchiveModuleCache();
    }

    currentKeyword.value = '';
    passwordOperationError.value = '';
    documentOperationError.value = '';
    resumeOperationError.value = '';
    imageOperationError.value = '';
    fileOperationError.value = '';
    await loadPageData('');
  },
  { immediate: true }
);
</script>

<template>
  <ArchivePageLoading
    v-if="!session.initialized.value"
    title="正在进入个人档案"
    description="正在同步当前模块数据，请稍候。"
  />
  <EntryGate
    v-else-if="!session.authenticated.value"
    :loading="session.loading.value"
    :error-message="session.errorMessage.value"
    @login="handleLogin"
  />
  <ModuleDetailShell
    v-else
    :module="currentModule"
    :summary="summary"
    :items="currentItems"
    :loading="loading"
    :error-message="moduleError"
    :user-name="currentUserName"
    :read-only="isReadOnlySession"
    :read-only-message="readOnlyMessage"
    :password-operation-loading="passwordOperationLoading"
    :password-operation-error="passwordOperationError"
    :password-success-version="passwordSuccessVersion"
    :password-delete-success-version="passwordDeleteSuccessVersion"
    :document-operation-loading="documentOperationLoading"
    :document-operation-error="documentOperationError"
    :document-success-version="documentSuccessVersion"
    :document-delete-success-version="documentDeleteSuccessVersion"
    :resume-operation-loading="resumeOperationLoading"
    :resume-operation-error="resumeOperationError"
    :resume-success-version="resumeSuccessVersion"
    :resume-delete-success-version="resumeDeleteSuccessVersion"
    :image-operation-loading="imageOperationLoading"
    :image-operation-error="imageOperationError"
    :image-success-version="imageSuccessVersion"
    :image-delete-success-version="imageDeleteSuccessVersion"
    :file-operation-loading="fileOperationLoading"
    :file-operation-error="fileOperationError"
    :file-success-version="fileSuccessVersion"
    :file-delete-success-version="fileDeleteSuccessVersion"
    @lock="handleLock"
    @back-home="handleBackHome"
    @open-module="handleOpenModule"
    @search="loadModuleData"
    @save-password="handleSavePassword"
    @delete-password="handleDeletePassword"
    @save-document="handleSaveDocument"
    @delete-document="handleDeleteDocument"
    @save-resume="handleSaveResume"
    @delete-resume="handleDeleteResume"
    @save-image="handleSaveImage"
    @delete-image="handleDeleteImage"
    @save-file="handleSaveFile"
    @delete-file="handleDeleteFile"
  />
</template>
