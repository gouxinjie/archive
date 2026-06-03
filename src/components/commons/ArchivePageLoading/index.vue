<script setup lang="ts">
/**
 * @component ArchivePageLoading
 * @description 个人档案全屏加载过渡组件
 * @author gouxinjie
 * @created 2026-06-02
 * @updated 2026-06-02
 */

import { FolderOpened } from '@element-plus/icons-vue';

interface ArchivePageLoadingProps {
  /** 类型：字符串；含义：加载态主标题；是否必填：否；默认值：正在进入个人档案 */
  title?: string;
  /** 类型：字符串；含义：加载态补充说明；是否必填：否；默认值：正在准备工作区，请稍候。 */
  description?: string;
}

const props = withDefaults(defineProps<ArchivePageLoadingProps>(), {
  title: '正在进入个人档案',
  description: '正在准备工作区，请稍候。'
});
</script>

<template>
  <section class="archive-page-loading" role="status" aria-live="polite" aria-busy="true">
    <div class="archive-page-loading__shell">
      <span class="archive-page-loading__icon" aria-hidden="true">
        <FolderOpened />
      </span>
      <h1 class="archive-page-loading__title">{{ props.title }}</h1>
      <p class="archive-page-loading__description">{{ props.description }}</p>
      <span class="archive-page-loading__dots" aria-hidden="true">
        <span class="archive-page-loading__dot" />
        <span class="archive-page-loading__dot" />
        <span class="archive-page-loading__dot" />
      </span>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
