<script setup lang="ts">
/**
 * @component EntryGate
 * @description 个人档案账号登录面板
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { computed, ref } from 'vue';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import { APP_ENGLISH_NAME, APP_NAME } from '~/constants/app';

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

const username = ref('xinjie');
const password = ref('');
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
    <section class="entry-gate__panel">
      <div class="entry-gate__brand">
        <span class="entry-gate__brand-mark">A</span>
        <div>
          <p class="entry-gate__eyebrow">{{ APP_ENGLISH_NAME }}</p>
          <h1 class="entry-gate__title">{{ APP_NAME }}</h1>
        </div>
      </div>

      <form class="entry-gate__form" @submit.prevent="submit">
        <AppInput
          v-model="username"
          label="账号登录"
          type="text"
          placeholder="请输入账号，例如 xinjie"
        />
        <AppInput
          v-model="password"
          label="登录密码"
          type="password"
          placeholder="请输入账号密码"
          :error="visibleError"
        />
        <p class="entry-gate__demo-tip">
          演示账号：<strong>demo</strong> / <strong>123456</strong>
        </p>
        <AppButton type="submit" :loading="props.loading">登录</AppButton>
      </form>
    </section>
  </main>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
