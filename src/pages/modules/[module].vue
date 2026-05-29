<script setup lang="ts">
/**
 * @component ModulePage
 * @description 个人档案模块详情页
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { computed, onMounted, ref, watch } from 'vue';
import EntryGate from '~/components/business/EntryGate/index.vue';
import ModuleDetailShell from '~/components/business/ModuleDetailShell/index.vue';
import { useArchiveSession } from '~/composables/useArchiveSession';
import { ARCHIVE_MODULES } from '~/constants/app';
import type { DashboardSummaryData } from '~/types/api';
import type {
  ArchiveModuleConfig,
  ArchiveModuleKey,
  FileAssetListItem,
  ModuleDetailData,
  PasswordFormPayload,
  PasswordListItem
} from '~/types/models';
import { request } from '~/utils/request';

const route = useRoute();
const session = useArchiveSession();
const summary = ref<DashboardSummaryData>({
  passwordCount: 0,
  documentCount: 0,
  resumeCount: 0,
  imageCount: 0,
  certificateCount: 0,
  studyCount: 0
});
const moduleData = ref<ModuleDetailData | null>(null);
const loading = ref(false);
const moduleError = ref('');
const currentKeyword = ref('');
const passwordOperationLoading = ref(false);
const passwordOperationError = ref('');
const passwordSuccessVersion = ref(0);
let moduleRequestSerial = 0;

const moduleKey = computed<ArchiveModuleKey | null>(() => {
  const value = route.params.module;
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const found = ARCHIVE_MODULES.find((item) => item.key === normalizedValue);
  return found?.key || null;
});

const fallbackModule = computed<ArchiveModuleConfig>(() => {
  return ARCHIVE_MODULES.find((item) => item.key === moduleKey.value) || ARCHIVE_MODULES[0]!;
});

const currentModule = computed<ArchiveModuleConfig>(() => {
  if (moduleData.value?.module.key === moduleKey.value) {
    return moduleData.value.module;
  }

  return fallbackModule.value;
});

const currentItems = computed<PasswordListItem[] | FileAssetListItem[]>(() => {
  if (moduleData.value?.module.key === moduleKey.value) {
    return moduleData.value.items;
  }

  return [];
});

/**
 * 加载左侧模块统计
 * @returns 无返回值
 * @throws 请求异常会向上抛出
 */
const loadSummary = async (): Promise<void> => {
  const response = await request<DashboardSummaryData>('/api/dashboard/summary');

  if (response.success) {
    summary.value = response.data;
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
    return;
  }

  const requestSerial = moduleRequestSerial + 1;
  moduleRequestSerial = requestSerial;
  currentKeyword.value = keyword;
  moduleError.value = '';
  loading.value = true;

  try {
    const response = await request<ModuleDetailData>(`/api/modules/${targetModuleKey}`, {
      query: { keyword }
    });

    if (requestSerial !== moduleRequestSerial || moduleKey.value !== targetModuleKey) {
      return;
    }

    if (response.success) {
      moduleData.value = response.data;
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
  }
};

/**
 * 加载模块页所需数据
 * @returns 无返回值
 * @throws 不主动抛出异常
 */
const loadPageData = async (keyword = currentKeyword.value): Promise<void> => {
  if (!session.authenticated.value) {
    return;
  }

  await Promise.all([loadSummary(), loadModuleData(keyword)]);
};

const handleSetup = async (password: string): Promise<void> => {
  await session.setupPassword(password);
};

const handleUnlock = async (password: string): Promise<void> => {
  await session.unlock(password);
};

const handleLock = async (): Promise<void> => {
  await session.lock();
  await navigateTo('/');
};

const handleBackHome = async (): Promise<void> => {
  await navigateTo('/');
};

const handleOpenModule = async (targetModuleKey: ArchiveModuleKey): Promise<void> => {
  await navigateTo(`/modules/${targetModuleKey}`);
};

const handleSavePassword = async (payload: PasswordFormPayload): Promise<void> => {
  passwordOperationLoading.value = true;
  passwordOperationError.value = '';
  moduleError.value = '';

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
    await loadPageData(currentKeyword.value);
  } catch (error: unknown) {
    passwordOperationError.value = error instanceof Error ? error.message : '密码记录保存失败';
    console.error(passwordOperationError.value);
  } finally {
    passwordOperationLoading.value = false;
  }
};

const handleDeletePassword = async (id: string): Promise<void> => {
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

    await loadPageData(currentKeyword.value);
  } catch (error: unknown) {
    moduleError.value = error instanceof Error ? error.message : '密码记录删除失败';
    console.error(moduleError.value);
  } finally {
    passwordOperationLoading.value = false;
  }
};

onMounted(async () => {
  if (!session.initialized.value) {
    await session.loadStatus();
  }
});

watch(
  [() => session.initialized.value, () => session.authenticated.value, () => route.fullPath],
  async ([initialized, authenticated]) => {
    if (initialized && authenticated) {
      currentKeyword.value = '';
      passwordOperationError.value = '';
      await loadPageData('');
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="!session.initialized.value" class="archive-page-loading">
    正在进入个人档案...
  </div>
  <EntryGate
    v-else-if="!session.authenticated.value"
    :needs-setup="session.needsSetup.value"
    :loading="session.loading.value"
    :error-message="session.errorMessage.value"
    @setup="handleSetup"
    @unlock="handleUnlock"
  />
  <ModuleDetailShell
    v-else
    :module="currentModule"
    :summary="summary"
    :items="currentItems"
    :loading="loading"
    :error-message="moduleError"
    :password-operation-loading="passwordOperationLoading"
    :password-operation-error="passwordOperationError"
    :password-success-version="passwordSuccessVersion"
    @lock="handleLock"
    @back-home="handleBackHome"
    @open-module="handleOpenModule"
    @search="loadModuleData"
    @save-password="handleSavePassword"
    @delete-password="handleDeletePassword"
  />
</template>
