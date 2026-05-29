<script setup lang="ts">
/**
 * @component EntryGate
 * @description 个人档案入口密码面板
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { computed, ref } from 'vue';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import { APP_ENGLISH_NAME, APP_NAME } from '~/constants/app';

interface EntryGateProps {
  /** 类型：布尔值；含义：是否需要首次设置密码；是否必填：是；默认值：false */
  needsSetup: boolean;
  /** 类型：布尔值；含义：是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：外部错误信息；是否必填：否；默认值：空字符串 */
  errorMessage?: string;
}

const props = withDefaults(defineProps<EntryGateProps>(), {
  errorMessage: ''
});

const emit = defineEmits<{
  setup: [password: string];
  unlock: [password: string];
}>();

const password = ref('');
const localError = ref('');

const title = computed<string>(() => (props.needsSetup ? '设置个人密码' : '输入个人密码'));
const buttonText = computed<string>(() => (props.needsSetup ? '创建并进入' : '进入档案'));
const visibleError = computed<string>(() => localError.value || props.errorMessage);

const submit = (): void => {
  localError.value = '';

  if (password.value.trim().length < 6) {
    localError.value = '个人密码至少需要 6 位';
    return;
  }

  if (props.needsSetup) {
    emit('setup', password.value);
    return;
  }

  emit('unlock', password.value);
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
          v-model="password"
          :label="title"
          type="password"
          placeholder="请输入你的个人密码"
          :error="visibleError"
        />
        <AppButton type="submit" :loading="props.loading">{{ buttonText }}</AppButton>
      </form>
    </section>
  </main>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
