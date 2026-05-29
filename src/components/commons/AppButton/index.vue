<script setup lang="ts">
/**
 * @component AppButton
 * @description 通用按钮组件，支持主按钮、次按钮和危险按钮
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

interface AppButtonProps {
  /** 类型：字符串；含义：按钮类型；是否必填：否；默认值：primary */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** 类型：布尔值；含义：是否处于加载状态；是否必填：否；默认值：false */
  loading?: boolean;
  /** 类型：布尔值；含义：是否禁用；是否必填：否；默认值：false */
  disabled?: boolean;
  /** 类型：按钮原生类型；含义：提交或普通按钮；是否必填：否；默认值：button */
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<AppButtonProps>(), {
  variant: 'primary',
  loading: false,
  disabled: false,
  type: 'button'
});
</script>

<template>
  <button
    class="archive-button"
    :class="`archive-button--${props.variant}`"
    :type="props.type"
    :disabled="props.disabled || props.loading"
  >
    <span v-if="props.loading" class="archive-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
