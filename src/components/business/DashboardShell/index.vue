<script setup lang="ts">
/**
 * @component DashboardShell
 * @description 个人档案首页仪表盘布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { computed, ref } from 'vue';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
import FileDropzone from '~/components/commons/FileDropzone/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
import type { DashboardSummaryData } from '~/types/api';
import type { ArchiveModuleConfig, ArchiveModuleKey } from '~/types/models';

type UserMenuCommand = 'logout';

interface DashboardShellProps {
  /** 类型：DashboardSummaryData；含义：首页统计数据；是否必填：是；默认值：无 */
  summary: DashboardSummaryData;
  /** 类型：布尔值；含义：统计数据是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：当前用户展示名称；是否必填：否；默认值：空字符串 */
  userName?: string;
}

const props = withDefaults(defineProps<DashboardShellProps>(), {
  userName: ''
});

const emit = defineEmits<{
  lock: [];
  openModule: [moduleKey: ArchiveModuleKey];
}>();

const selectedFiles = ref<File[]>([]);

const moduleCounts = computed<Record<ArchiveModuleConfig['key'], number>>(() => ({
  passwords: props.summary.passwordCount,
  documents: props.summary.documentCount,
  resumes: props.summary.resumeCount,
  images: props.summary.imageCount,
  certificates: props.summary.certificateCount,
  study: props.summary.studyCount
}));

const archiveTotal = computed<number>(() => {
  return Object.values(moduleCounts.value).reduce((total, count) => total + count, 0);
});

const userAvatarText = computed<string>(() => {
  return props.userName.trim().slice(0, 1).toUpperCase() || 'A';
});

const handleFilesSelected = (files: File[]): void => {
  selectedFiles.value = files;
};

const handleOpenModule = (moduleKey: ArchiveModuleKey): void => {
  emit('openModule', moduleKey);
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
</script>

<template>
  <div class="dashboard-shell">
    <header class="dashboard-shell__header">
      <div class="dashboard-shell__topbar">
        <div class="dashboard-shell__brand">
          <span class="dashboard-shell__brand-mark">A</span>
          <span>
            <span class="dashboard-shell__brand-en">{{ APP_ENGLISH_NAME }}</span>
            <strong class="dashboard-shell__brand-name">{{ APP_NAME }}</strong>
          </span>
        </div>

        <nav class="dashboard-shell__module-nav" aria-label="档案模块">
          <div class="dashboard-shell__module-track">
            <button
              class="dashboard-shell__module-tab dashboard-shell__module-tab--active"
              type="button"
              aria-current="page"
            >
              <span>首页</span>
            </button>
            <button
              v-for="module in ARCHIVE_MODULES"
              :key="module.key"
              class="dashboard-shell__module-tab"
              type="button"
              @click="handleOpenModule(module.key)"
            >
              <span>{{ module.name }}</span>
            </button>
          </div>
        </nav>

        <div class="dashboard-shell__topbar-actions">
          <el-dropdown
            class="dashboard-shell__user-menu"
            trigger="click"
            popper-class="dashboard-shell__avatar-menu"
            @command="handleUserMenuCommand"
          >
            <button
              class="dashboard-shell__avatar"
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

    <main class="dashboard-shell__main">
      <section class="dashboard-shell__overview">
        <div class="dashboard-shell__overview-content">
          <p class="dashboard-shell__eyebrow">Private Archive</p>
          <h1 class="dashboard-shell__title">档案仪表盘</h1>
          <p class="dashboard-shell__description">
            管理密码、文档、简历、图片、证件和学习资料。当前账号的数据独立归档。
          </p>
        </div>

        <div class="dashboard-shell__stats" aria-label="档案统计">
          <div class="dashboard-shell__stat">
            <span class="dashboard-shell__stat-label">归档总量</span>
            <strong class="dashboard-shell__stat-value">
              <span v-if="props.loading">...</span>
              <span v-else>{{ archiveTotal }}</span>
            </strong>
          </div>
          <div class="dashboard-shell__stat">
            <span class="dashboard-shell__stat-label">密码记录</span>
            <strong class="dashboard-shell__stat-value">{{ props.loading ? '...' : moduleCounts.passwords }}</strong>
          </div>
          <div class="dashboard-shell__stat">
            <span class="dashboard-shell__stat-label">文件资料</span>
            <strong class="dashboard-shell__stat-value">
              {{ props.loading ? '...' : archiveTotal - moduleCounts.passwords }}
            </strong>
          </div>
        </div>
      </section>

      <section class="dashboard-shell__workspace">
        <section class="dashboard-shell__module-list" aria-label="档案模块概览">
          <header class="dashboard-shell__section-head">
            <div>
              <p class="dashboard-shell__section-kicker">Modules</p>
              <h2 class="dashboard-shell__section-title">档案模块</h2>
            </div>
            <span class="dashboard-shell__section-count">{{ ARCHIVE_MODULES.length }} 个模块</span>
          </header>

          <div class="dashboard-shell__module-grid">
            <article
              v-for="module in ARCHIVE_MODULES"
              :key="module.key"
              class="dashboard-shell__module-row"
            >
              <span class="dashboard-shell__module-dot" :class="`dashboard-shell__module-dot--${module.tone}`" />
              <div class="dashboard-shell__module-info">
                <h2 class="dashboard-shell__module-title">{{ module.name }}</h2>
                <p class="dashboard-shell__module-description">{{ module.description }}</p>
              </div>
              <strong class="dashboard-shell__module-total">
                <span v-if="props.loading">...</span>
                <span v-else>{{ moduleCounts[module.key] }}</span>
              </strong>
              <AppButton variant="secondary" @click="handleOpenModule(module.key)">进入</AppButton>
            </article>
          </div>
        </section>

        <aside class="dashboard-shell__upload-area">
          <header class="dashboard-shell__section-head">
            <div>
              <p class="dashboard-shell__section-kicker">Upload</p>
              <h2 class="dashboard-shell__section-title">快速上传</h2>
            </div>
          </header>

          <FileDropzone
            title="拖拽上传"
            description="拖拽文件到这里，后续会按模块保存到 ECS 本地 uploads 目录"
            @files-selected="handleFilesSelected"
          />
          <p v-if="selectedFiles.length > 0" class="dashboard-shell__upload-tip">
            已选择 {{ selectedFiles.length }} 个文件，上传接口会在模块 CRUD 阶段接入。
          </p>
        </aside>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
