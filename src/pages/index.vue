<script setup lang="ts">
/**
 * @component HomePage
 * @description 个人档案首页，负责解锁状态和首页统计数据
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { onMounted, ref, watch } from 'vue';
import DashboardShell from '~/components/business/DashboardShell/index.vue';
import EntryGate from '~/components/business/EntryGate/index.vue';
import { useArchiveSession } from '~/composables/useArchiveSession';
import type { DashboardSummaryData } from '~/types/api';
import type { ArchiveModuleKey } from '~/types/models';
import { request } from '~/utils/request';

const session = useArchiveSession();
const summary = ref<DashboardSummaryData>({
  passwordCount: 0,
  documentCount: 0,
  resumeCount: 0,
  imageCount: 0,
  certificateCount: 0,
  studyCount: 0
});
const summaryLoading = ref(false);

const loadSummary = async (): Promise<void> => {
  summaryLoading.value = true;

  try {
    const response = await request<DashboardSummaryData>('/api/dashboard/summary');

    if (response.success) {
      summary.value = response.data;
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : '获取首页统计失败');
  } finally {
    summaryLoading.value = false;
  }
};

const handleSetup = async (password: string): Promise<void> => {
  await session.setupPassword(password);
};

const handleUnlock = async (password: string): Promise<void> => {
  await session.unlock(password);
};

const handleLock = async (): Promise<void> => {
  await session.lock();
};

const handleOpenModule = async (moduleKey: ArchiveModuleKey): Promise<void> => {
  await navigateTo(`/modules/${moduleKey}`);
};

onMounted(async () => {
  await session.loadStatus();
});

watch(
  () => session.authenticated.value,
  async (authenticated) => {
    if (authenticated) {
      await loadSummary();
    }
  }
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
  <DashboardShell
    v-else
    :summary="summary"
    :loading="summaryLoading"
    @lock="handleLock"
    @open-module="handleOpenModule"
  />
</template>
