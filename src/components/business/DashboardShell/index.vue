<script setup lang="ts">
/**
 * @component DashboardShell
 * @description 个人档案首页仪表盘布局
 * @author gouxinjie
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { computed } from 'vue';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
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

interface DashboardTonePalette {
  /** 类型：字符串；含义：图表柔和底色；是否必填：是；默认值：无 */
  soft: string;
  /** 类型：字符串；含义：图表渐变色；是否必填：是；默认值：无 */
  gradient: string;
}

interface DashboardDistributionItem {
  /** 类型：ArchiveModuleKey；含义：模块唯一标识；是否必填：是；默认值：无 */
  key: ArchiveModuleKey;
  /** 类型：字符串；含义：模块名称；是否必填：是；默认值：无 */
  name: string;
  /** 类型：ArchiveModuleConfig['tone']；含义：模块色调；是否必填：是；默认值：无 */
  tone: ArchiveModuleConfig['tone'];
  /** 类型：数字；含义：模块当前数量；是否必填：是；默认值：0 */
  count: number;
  /** 类型：字符串；含义：模块占比文案；是否必填：是；默认值：0% */
  shareLabel: string;
  /** 类型：记录对象；含义：分布条样式变量；是否必填：是；默认值：空对象 */
  style: Record<string, string>;
}

const props = withDefaults(defineProps<DashboardShellProps>(), {
  userName: ''
});

const emit = defineEmits<{
  lock: [];
  openModule: [moduleKey: ArchiveModuleKey];
}>();

const dashboardTonePalettes: Record<ArchiveModuleConfig['tone'], DashboardTonePalette> = {
  blue: {
    soft: 'rgba(47, 107, 255, 0.14)',
    gradient: 'linear-gradient(90deg, #2f6bff 0%, #6f9cff 100%)'
  },
  cyan: {
    soft: 'rgba(8, 145, 178, 0.16)',
    gradient: 'linear-gradient(90deg, #0891b2 0%, #32b7d4 100%)'
  },
  indigo: {
    soft: 'rgba(79, 70, 229, 0.16)',
    gradient: 'linear-gradient(90deg, #4f46e5 0%, #7c74f1 100%)'
  },
  teal: {
    soft: 'rgba(13, 148, 136, 0.16)',
    gradient: 'linear-gradient(90deg, #0d9488 0%, #33b6a8 100%)'
  },
  sky: {
    soft: 'rgba(37, 99, 235, 0.16)',
    gradient: 'linear-gradient(90deg, #2563eb 0%, #5b92ff 100%)'
  },
  violet: {
    soft: 'rgba(124, 58, 237, 0.16)',
    gradient: 'linear-gradient(90deg, #7c3aed 0%, #9b6df7 100%)'
  }
};

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

const fileArchiveTotal = computed<number>(() => {
  return archiveTotal.value - moduleCounts.value.passwords;
});

const passwordShare = computed<number>(() => {
  if (archiveTotal.value <= 0) {
    return 0;
  }

  return Number(((moduleCounts.value.passwords / archiveTotal.value) * 100).toFixed(1));
});

const fileArchiveShare = computed<number>(() => {
  if (archiveTotal.value <= 0) {
    return 0;
  }

  return Number(((fileArchiveTotal.value / archiveTotal.value) * 100).toFixed(1));
});

const ratioRingStyle = computed<Record<string, string>>(() => {
  if (props.loading || archiveTotal.value <= 0) {
    return {
      background: 'conic-gradient(#dce7f8 0 100%)'
    };
  }

  return {
    background: `conic-gradient(#2f6bff 0 ${passwordShare.value}%, #16a085 ${passwordShare.value}% 100%)`
  };
});

const moduleDistribution = computed<DashboardDistributionItem[]>(() => {
  const maxCount = Math.max(...ARCHIVE_MODULES.map((module) => moduleCounts.value[module.key]), 0);

  return ARCHIVE_MODULES.map((module) => {
    const count = moduleCounts.value[module.key];
    const share = archiveTotal.value > 0 ? (count / archiveTotal.value) * 100 : 0;
    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const palette = dashboardTonePalettes[module.tone];

    return {
      key: module.key,
      name: module.name,
      tone: module.tone,
      count,
      shareLabel: archiveTotal.value > 0 ? `${share.toFixed(1)}%` : '0%',
      style: {
        '--distribution-fill': palette.gradient,
        '--distribution-soft': palette.soft,
        '--distribution-width': `${count > 0 ? Math.max(barWidth, 12) : 0}%`
      }
    };
  }).sort((left, right) => right.count - left.count);
});

const activeModuleCount = computed<number>(() => {
  return moduleDistribution.value.filter((item) => item.count > 0).length;
});

const dominantModule = computed<DashboardDistributionItem | null>(() => {
  return moduleDistribution.value.find((item) => item.count > 0) || null;
});

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

        <aside class="dashboard-shell__insight-panel">
          <header class="dashboard-shell__section-head">
            <div>
              <p class="dashboard-shell__section-kicker">Insights</p>
              <h2 class="dashboard-shell__section-title">结构概览</h2>
            </div>
            <span class="dashboard-shell__section-count">
              {{ props.loading ? '...' : `${activeModuleCount}/${ARCHIVE_MODULES.length} 已使用` }}
            </span>
          </header>

          <section class="dashboard-shell__ratio-card">
            <div class="dashboard-shell__ratio-ring" :style="ratioRingStyle">
              <div class="dashboard-shell__ratio-ring-inner">
                <strong class="dashboard-shell__ratio-ring-total">
                  {{ props.loading ? '...' : archiveTotal }}
                </strong>
                <span class="dashboard-shell__ratio-ring-label">总归档</span>
              </div>
            </div>

            <div class="dashboard-shell__ratio-legend">
              <article class="dashboard-shell__ratio-item">
                <div class="dashboard-shell__ratio-item-head">
                  <span class="dashboard-shell__ratio-item-label">
                    <span class="dashboard-shell__ratio-item-dot dashboard-shell__ratio-item-dot--passwords" />
                    密码记录
                  </span>
                  <strong class="dashboard-shell__ratio-item-value">
                    {{ props.loading ? '...' : moduleCounts.passwords }}
                  </strong>
                </div>
                <p class="dashboard-shell__ratio-item-meta">
                  {{ props.loading ? '占比加载中' : `占全部归档 ${passwordShare}%` }}
                </p>
              </article>

              <article class="dashboard-shell__ratio-item">
                <div class="dashboard-shell__ratio-item-head">
                  <span class="dashboard-shell__ratio-item-label">
                    <span class="dashboard-shell__ratio-item-dot dashboard-shell__ratio-item-dot--files" />
                    文件资料
                  </span>
                  <strong class="dashboard-shell__ratio-item-value">
                    {{ props.loading ? '...' : fileArchiveTotal }}
                  </strong>
                </div>
                <p class="dashboard-shell__ratio-item-meta">
                  {{ props.loading ? '占比加载中' : `占全部归档 ${fileArchiveShare}%` }}
                </p>
              </article>
            </div>
          </section>

          <section class="dashboard-shell__insight-metrics" aria-label="首页洞察">
            <article class="dashboard-shell__insight-metric">
              <span class="dashboard-shell__insight-metric-label">主力模块</span>
              <strong class="dashboard-shell__insight-metric-value">
                {{ props.loading ? '...' : dominantModule?.name || '暂无数据' }}
              </strong>
              <p class="dashboard-shell__insight-metric-meta">
                {{ props.loading ? '模块占比计算中' : dominantModule ? `当前占比 ${dominantModule.shareLabel}` : '录入数据后会自动生成' }}
              </p>
            </article>

            <article class="dashboard-shell__insight-metric">
              <span class="dashboard-shell__insight-metric-label">覆盖模块</span>
              <strong class="dashboard-shell__insight-metric-value">
                {{ props.loading ? '...' : `${activeModuleCount} 个` }}
              </strong>
              <p class="dashboard-shell__insight-metric-meta">
                {{ props.loading ? '模块使用情况加载中' : `还有 ${ARCHIVE_MODULES.length - activeModuleCount} 个模块待补充` }}
              </p>
            </article>
          </section>

          <section class="dashboard-shell__distribution" aria-label="模块分布图表">
            <div class="dashboard-shell__subsection-head">
              <h3 class="dashboard-shell__subsection-title">模块分布</h3>
              <span class="dashboard-shell__subsection-meta">
                {{ props.loading ? '统计中' : '按当前归档数量展示' }}
              </span>
            </div>

            <ul class="dashboard-shell__distribution-list">
              <li
                v-for="item in moduleDistribution"
                :key="item.key"
                class="dashboard-shell__distribution-item"
                :style="item.style"
              >
                <div class="dashboard-shell__distribution-top">
                  <div class="dashboard-shell__distribution-label">
                    <span class="dashboard-shell__module-dot" :class="`dashboard-shell__module-dot--${item.tone}`" />
                    <span class="dashboard-shell__distribution-name">{{ item.name }}</span>
                  </div>
                  <strong class="dashboard-shell__distribution-count">
                    {{ props.loading ? '...' : item.count }}
                  </strong>
                </div>
                <div class="dashboard-shell__distribution-track">
                  <span class="dashboard-shell__distribution-fill" />
                </div>
                <span class="dashboard-shell__distribution-share">
                  {{ props.loading ? '占比计算中' : `占全部归档 ${item.shareLabel}` }}
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
