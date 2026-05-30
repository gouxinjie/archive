<script setup lang="ts">
/**
 * @component FileDropzone
 * @description 通用拖拽上传区域组件
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-30
 */

import { ref } from 'vue';

interface FileDropzoneProps {
  /** 类型：字符串；含义：上传区域标题；是否必填：否；默认值：拖拽文件到这里 */
  title?: string;
  /** 类型：字符串；含义：上传区域说明；是否必填：否；默认值：支持文档、图片和 PDF */
  description?: string;
  /** 类型：字符串；含义：input accept 属性；是否必填：否；默认值：空字符串 */
  accept?: string;
  /** 类型：布尔值；含义：是否允许一次选择多个文件；是否必填：否；默认值：true */
  multiple?: boolean;
}

const props = withDefaults(defineProps<FileDropzoneProps>(), {
  title: '拖拽文件到这里',
  description: '支持文档、图片、PDF 和 Markdown',
  accept: '',
  multiple: true
});

const emit = defineEmits<{
  filesSelected: [files: File[]];
}>();

const hovering = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const emitFiles = (fileList: FileList | null): void => {
  const files = Array.from(fileList || []);

  if (files.length > 0) {
    emit('filesSelected', files);
  }
};

const handleDrop = (event: DragEvent): void => {
  hovering.value = false;
  emitFiles(event.dataTransfer?.files || null);
};

const handleSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emitFiles(target.files);
  target.value = '';
};

const openFilePicker = (): void => {
  inputRef.value?.click();
};
</script>

<template>
  <section
    class="archive-dropzone"
    :class="{ 'archive-dropzone--hovering': hovering }"
    @dragover.prevent="hovering = true"
    @dragleave.prevent="hovering = false"
    @drop.prevent="handleDrop"
  >
    <div class="archive-dropzone__mark" aria-hidden="true">+</div>
    <div class="archive-dropzone__content">
      <h2 class="archive-dropzone__title">{{ props.title }}</h2>
      <p class="archive-dropzone__description">{{ props.description }}</p>
    </div>
    <button class="archive-dropzone__action" type="button" @click="openFilePicker">
      选择文件
    </button>
    <input
      ref="inputRef"
      class="archive-dropzone__input"
      type="file"
      :multiple="props.multiple"
      :accept="props.accept"
      @change="handleSelect"
    >
  </section>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
