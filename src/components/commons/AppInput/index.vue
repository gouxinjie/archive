<script setup lang="ts">
/**
 * @component AppInput
 * @description 通用输入框组件，提供标签、错误提示和密码输入能力
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

interface AppInputProps {
  /** 类型：字符串；含义：输入框绑定值；是否必填：是；默认值：空字符串 */
  modelValue: string;
  /** 类型：字符串；含义：输入框标签；是否必填：是；默认值：无 */
  label: string;
  /** 类型：字符串；含义：输入框类型；是否必填：否；默认值：text */
  type?: 'text' | 'password' | 'search';
  /** 类型：字符串；含义：占位文本；是否必填：否；默认值：空字符串 */
  placeholder?: string;
  /** 类型：字符串；含义：错误提示；是否必填：否；默认值：空字符串 */
  error?: string;
  /** 类型：布尔值；含义：是否禁用输入；是否必填：否；默认值：false */
  disabled?: boolean;
}

const props = withDefaults(defineProps<AppInputProps>(), {
  type: 'text',
  placeholder: '',
  error: '',
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <label class="archive-input">
    <span class="archive-input__label">{{ props.label }}</span>
    <input
      class="archive-input__control"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      @input="handleInput"
    >
    <span v-if="props.error" class="archive-input__error">{{ props.error }}</span>
  </label>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
