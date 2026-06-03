<script setup lang="ts">
/**
 * @component EntryGate
 * @description 个人档案账号登录面板
 * @author gouxinjie
 * @created 2026-05-29
 * @updated 2026-06-02
 */

import { computed, ref } from 'vue';
import {
  FolderOpened,
  Lock,
  User,
  View
} from '@element-plus/icons-vue';
import AppButton from '~/components/commons/AppButton/index.vue';
import { APP_NAME } from '~/constants/app';

interface EntryGateProps {
  /** 类型：布尔值；含义：是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：外部错误信息；是否必填：否；默认值：空字符串 */
  errorMessage?: string;
}

const props = withDefaults(defineProps<EntryGateProps>(), {
  errorMessage: ''
});

const emit = defineEmits<{
  login: [username: string, password: string];
}>();

const username = ref('demo');
const password = ref('123456');
const localError = ref('');

const visibleError = computed<string>(() => localError.value || props.errorMessage);

const submit = (): void => {
  localError.value = '';

  if (!username.value.trim()) {
    localError.value = '请输入登录账号';
    return;
  }

  if (password.value.trim().length < 6) {
    localError.value = '登录密码至少需要 6 位';
    return;
  }

  emit('login', username.value, password.value);
};
</script>

<template>
  <main class="entry-gate">
    <section class="entry-gate__layout" aria-label="个人档案登录">
      <section class="entry-gate__hero" aria-label="个人档案介绍">
        <div class="entry-gate__brand">
          <span class="entry-gate__brand-mark" aria-hidden="true">
            <FolderOpened />
          </span>
          <strong class="entry-gate__brand-name">{{ APP_NAME }}</strong>
        </div>

        <div class="entry-gate__hero-copy">
          <h1 class="entry-gate__title">
            生活负责流动，<br>我负责打捞<span class="entry-gate__title-dot" aria-hidden="true" />
          </h1>
          <span class="entry-gate__title-line" aria-hidden="true" />
          <p class="entry-gate__description">所有重要的信息，都值得被妥善保存</p>
        </div>
      </section>

      <section class="entry-gate__login-area" aria-label="登录表单">
        <div class="entry-gate__panel">
          <div class="entry-gate__panel-icon" aria-hidden="true">
            <FolderOpened />
          </div>

          <header class="entry-gate__panel-head">
            <h2 class="entry-gate__panel-title">欢迎回来</h2>
            <p class="entry-gate__panel-subtitle">登录你的个人档案</p>
            <span class="entry-gate__wave" aria-hidden="true" />
          </header>

          <div class="entry-gate__demo-tip" role="note" aria-label="演示账号提示">
            <p class="entry-gate__demo-tip-title">演示账号说明</p>
            <p class="entry-gate__demo-tip-text">当前默认填充 demo / 123456。登录后仅支持查看，不支持新增、编辑、上传、删除或下载。</p>
          </div>

          <form class="entry-gate__form" @submit.prevent="submit">
            <label class="entry-gate__field">
              <span class="entry-gate__field-label">账号</span>
              <span class="entry-gate__field-shell">
                <User class="entry-gate__field-icon" aria-hidden="true" />
                <input
                  v-model="username"
                  class="entry-gate__input"
                  type="text"
                  autocomplete="username"
                  placeholder="手机号 / 邮箱 / 账号"
                >
              </span>
            </label>

            <label class="entry-gate__field">
              <span class="entry-gate__field-label">密码</span>
              <span class="entry-gate__field-shell">
                <Lock class="entry-gate__field-icon" aria-hidden="true" />
                <input
                  v-model="password"
                  class="entry-gate__input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                >
                <View class="entry-gate__field-icon entry-gate__field-icon--trail" aria-hidden="true" />
              </span>
            </label>

            <p v-if="visibleError" class="entry-gate__error">{{ visibleError }}</p>

            <AppButton type="submit" :loading="props.loading">登 录</AppButton>
          </form>
        </div>

        <p class="entry-gate__copyright">© 2026 {{ APP_NAME }} · 记录生活，沉淀自己</p>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
