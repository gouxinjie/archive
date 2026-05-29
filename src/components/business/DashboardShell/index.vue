<script setup lang="ts">
/**
 * @component DashboardShell
 * @description 个人档案主控制台布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { computed, ref } from 'vue';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import FileDropzone from '~/components/commons/FileDropzone/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
import type { DashboardSummaryData } from '~/types/api';
import type { ArchiveModuleConfig, ArchiveModuleKey } from '~/types/models';

interface DashboardShellProps {
  /** 类型：DashboardSummaryData；含义：首页统计数据；是否必填：是；默认值：无 */
  summary: DashboardSummaryData;
  /** 类型：布尔值；含义：统计数据是否加载中；是否必填：是；默认值：false */
  loading: boolean;
}

const props = defineProps<DashboardShellProps>();

const emit = defineEmits<{
  lock: [];
  openModule: [moduleKey: ArchiveModuleKey];
}>();

const searchKeyword = ref('');
const selectedFiles = ref<File[]>([]);

const moduleCounts = computed<Record<ArchiveModuleConfig['key'], number>>(() => ({
  passwords: props.summary.passwordCount,
  documents: props.summary.documentCount,
  resumes: props.summary.resumeCount,
  images: props.summary.imageCount,
  certificates: props.summary.certificateCount,
  study: props.summary.studyCount
}));

const filteredModules = computed<readonly ArchiveModuleConfig[]>(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  if (!keyword) {
    return ARCHIVE_MODULES;
  }

  return ARCHIVE_MODULES.filter((item) => {
    return item.name.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword);
  });
});

const handleFilesSelected = (files: File[]): void => {
  selectedFiles.value = files;
};

const handleOpenModule = (moduleKey: ArchiveModuleKey): void => {
  emit('openModule', moduleKey);
};
</script>

<template>
  <div class="dashboard-shell">
    <aside class="dashboard-shell__sidebar">
      <div class="dashboard-shell__brand">
        <span class="dashboard-shell__brand-mark">A</span>
        <div>
          <p class="dashboard-shell__brand-en">{{ APP_ENGLISH_NAME }}</p>
          <strong class="dashboard-shell__brand-name">{{ APP_NAME }}</strong>
        </div>
      </div>

      <nav class="dashboard-shell__nav" aria-label="档案模块">
        <button
          v-for="module in ARCHIVE_MODULES"
          :key="module.key"
          class="dashboard-shell__nav-item"
          type="button"
          @click="handleOpenModule(module.key)"
        >
          <span class="dashboard-shell__nav-dot" :class="`dashboard-shell__nav-dot--${module.tone}`" />
          <span>{{ module.name }}</span>
          <span class="dashboard-shell__nav-count">{{ moduleCounts[module.key] }}</span>
        </button>
      </nav>
    </aside>

    <main class="dashboard-shell__main">
      <header class="dashboard-shell__topbar">
        <AppInput
          v-model="searchKeyword"
          class="dashboard-shell__search"
          label="全局搜索"
          type="search"
          placeholder="搜索模块、文件、账号或备注"
        />
        <AppButton variant="ghost" @click="emit('lock')">锁屏</AppButton>
      </header>

      <section class="dashboard-shell__hero">
        <div>
          <p class="dashboard-shell__eyebrow">Private Archive</p>
          <h1 class="dashboard-shell__title">冷色调私人资料管理台</h1>
          <p class="dashboard-shell__description">
            管理密码、文档、简历、图片、证件和学习资料。第一版先完成单人解锁、基础表结构和文件入口。
          </p>
        </div>
      </section>

      <FileDropzone
        title="快速上传"
        description="拖拽文件到这里，后续会按模块保存到 ECS 本地 uploads 目录"
        @files-selected="handleFilesSelected"
      />

      <p v-if="selectedFiles.length > 0" class="dashboard-shell__upload-tip">
        已选择 {{ selectedFiles.length }} 个文件，上传接口会在模块 CRUD 阶段接入。
      </p>

      <section class="dashboard-shell__grid" aria-label="档案模块概览">
        <article
          v-for="module in filteredModules"
          :key="module.key"
          class="dashboard-shell__module"
          :class="`dashboard-shell__module--${module.tone}`"
        >
          <div>
            <p class="dashboard-shell__module-count">
              <span v-if="props.loading">...</span>
              <span v-else>{{ moduleCounts[module.key] }}</span>
            </p>
            <h2 class="dashboard-shell__module-title">{{ module.name }}</h2>
            <p class="dashboard-shell__module-description">{{ module.description }}</p>
          </div>
          <AppButton variant="secondary" @click="handleOpenModule(module.key)">进入模块</AppButton>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
