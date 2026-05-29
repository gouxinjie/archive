<script setup lang="ts">
/**
 * @component ModuleDetailShell
 * @description 个人档案模块详情页布局
 * @author Codex
 * @created 2026-05-29
 * @updated 2026-05-29
 */

import { computed, ref, watch } from 'vue';
import {
  Delete,
  EditPen,
  Hide,
  Link,
  Plus,
  View
} from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElLink,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  type FormInstance,
  type FormRules
} from 'element-plus';
import AppButton from '~/components/commons/AppButton/index.vue';
import AppInput from '~/components/commons/AppInput/index.vue';
import { APP_ENGLISH_NAME, APP_NAME, ARCHIVE_MODULES } from '~/constants/app';
import type { DashboardSummaryData } from '~/types/api';
import type {
  ArchiveModuleConfig,
  ArchiveModuleKey,
  FileAssetListItem,
  PasswordFormPayload,
  PasswordListItem
} from '~/types/models';

interface ModuleDetailShellProps {
  /** 类型：ArchiveModuleConfig；含义：当前模块配置；是否必填：是；默认值：无 */
  module: ArchiveModuleConfig;
  /** 类型：DashboardSummaryData；含义：左侧模块统计；是否必填：是；默认值：无 */
  summary: DashboardSummaryData;
  /** 类型：PasswordListItem[] 或 FileAssetListItem[]；含义：模块列表；是否必填：是；默认值：空数组 */
  items: PasswordListItem[] | FileAssetListItem[];
  /** 类型：布尔值；含义：模块数据是否加载中；是否必填：是；默认值：false */
  loading: boolean;
  /** 类型：字符串；含义：模块加载错误提示；是否必填：否；默认值：空字符串 */
  errorMessage?: string;
  /** 类型：布尔值；含义：密码增删改操作是否执行中；是否必填：否；默认值：false */
  passwordOperationLoading?: boolean;
  /** 类型：字符串；含义：密码抽屉内操作错误提示；是否必填：否；默认值：空字符串 */
  passwordOperationError?: string;
  /** 类型：数字；含义：密码保存成功信号；是否必填：否；默认值：0 */
  passwordSuccessVersion?: number;
}

const props = withDefaults(defineProps<ModuleDetailShellProps>(), {
  errorMessage: '',
  passwordOperationLoading: false,
  passwordOperationError: '',
  passwordSuccessVersion: 0
});

const emit = defineEmits<{
  lock: [];
  backHome: [];
  openModule: [moduleKey: ArchiveModuleKey];
  search: [keyword: string];
  savePassword: [payload: PasswordFormPayload];
  deletePassword: [id: string];
}>();

const keyword = ref('');
const visiblePasswordIds = ref<Record<string, boolean>>({});
const passwordDrawerVisible = ref(false);
const passwordDrawerMode = ref<'create' | 'edit' | 'view'>('create');
const passwordFormError = ref('');
const passwordSubmitAttempted = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = ref<PasswordFormPayload>({
  title: '',
  category: '其他',
  loginUrl: '',
  loginMethod: '',
  account: '',
  password: '',
  phone: '',
  email: '',
  remark: ''
});
const passwordCategoryOptions = ['阿里系', '腾讯系', '谷歌系', '开发平台', '社交媒体', '其他'];
const loginMethodOptions = ['手机号', '邮箱', '微信', 'GitHub', '账号密码', '扫码登录'];
const passwordFormRules: FormRules<PasswordFormPayload> = {
  title: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
};

const moduleCounts = computed<Record<ArchiveModuleKey, number>>(() => ({
  passwords: props.summary.passwordCount,
  documents: props.summary.documentCount,
  resumes: props.summary.resumeCount,
  images: props.summary.imageCount,
  certificates: props.summary.certificateCount,
  study: props.summary.studyCount
}));

const isPasswordModule = computed<boolean>(() => props.module.key === 'passwords');
const isPasswordDrawerReadonly = computed<boolean>(() => passwordDrawerMode.value === 'view');
const passwordDrawerTitle = computed<string>(() => {
  if (passwordDrawerMode.value === 'create') {
    return '新增密码';
  }

  if (passwordDrawerMode.value === 'edit') {
    return '编辑密码';
  }

  return '查看密码';
});
const passwordDrawerErrorMessage = computed<string>(() => {
  if (passwordFormError.value) {
    return passwordFormError.value;
  }

  return passwordSubmitAttempted.value ? props.passwordOperationError : '';
});

const passwordItems = computed<PasswordListItem[]>(() => {
  if (!isPasswordModule.value) {
    return [];
  }

  return props.items as PasswordListItem[];
});

const fileItems = computed<FileAssetListItem[]>(() => {
  if (isPasswordModule.value) {
    return [];
  }

  return props.items as FileAssetListItem[];
});

/**
 * 格式化文件大小
 * @param size - 文件字节数
 * @returns 可读文件大小
 * @throws 不抛出异常
 */
const formatSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
};

/**
 * 掩码显示密码
 * @param password - 明文密码
 * @returns 掩码后的密码文本
 * @throws 不抛出异常
 */
const maskPassword = (password: string | null): string => {
  if (!password) {
    return '-';
  }

  return '********';
};

const handleSearch = (): void => {
  emit('search', keyword.value);
};

const openCreatePasswordDrawer = (): void => {
  passwordDrawerMode.value = 'create';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  passwordForm.value = {
    title: '',
    category: '其他',
    loginUrl: '',
    loginMethod: '',
    account: '',
    password: '',
    phone: '',
    email: '',
    remark: ''
  };
  passwordDrawerVisible.value = true;
};

const fillPasswordForm = (item: PasswordListItem): void => {
  passwordForm.value = {
    id: item.id,
    title: item.title,
    category: item.category,
    loginUrl: item.loginUrl || '',
    loginMethod: item.loginMethod || '',
    account: item.account || '',
    password: item.password || '',
    phone: item.phone || '',
    email: item.email || '',
    remark: item.remark || ''
  };
};

const openEditPasswordDrawer = (item: PasswordListItem): void => {
  passwordDrawerMode.value = 'edit';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  fillPasswordForm(item);
  passwordDrawerVisible.value = true;
};

const openViewPasswordDrawer = (item: PasswordListItem): void => {
  passwordDrawerMode.value = 'view';
  passwordFormError.value = '';
  passwordSubmitAttempted.value = false;
  fillPasswordForm(item);
  passwordDrawerVisible.value = true;
};

const closePasswordDrawer = (): void => {
  passwordDrawerVisible.value = false;
  passwordSubmitAttempted.value = false;
};

const submitPasswordForm = async (): Promise<void> => {
  if (isPasswordDrawerReadonly.value || props.passwordOperationLoading) {
    return;
  }

  if (!passwordFormRef.value) {
    return;
  }

  const valid = await passwordFormRef.value.validate();

  if (!valid) {
    return;
  }

  passwordFormError.value = '';
  passwordSubmitAttempted.value = true;
  emit('savePassword', { ...passwordForm.value });
};

const requestDeletePassword = (id: string): void => {
  if (!props.passwordOperationLoading) {
    emit('deletePassword', id);
  }
};

const togglePasswordVisible = (id: string): void => {
  visiblePasswordIds.value = {
    ...visiblePasswordIds.value,
    [id]: !visiblePasswordIds.value[id]
  };
};

const getPasswordDisplayText = (item: PasswordListItem): string => {
  if (visiblePasswordIds.value[item.id]) {
    return item.password || '-';
  }

  return maskPassword(item.password);
};

const getBindingText = (item: PasswordListItem): string => {
  const values = [item.phone, item.email].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(' / ') : '-';
};

const getLoginUrlHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '打开链接';
  }
};

watch(
  () => props.module.key,
  () => {
    passwordDrawerVisible.value = false;
  }
);

watch(
  () => props.passwordSuccessVersion,
  () => {
    if (passwordDrawerVisible.value && !isPasswordDrawerReadonly.value) {
      closePasswordDrawer();
    }
  }
);
</script>

<template>
  <div class="module-detail">
    <aside class="module-detail__sidebar">
      <button class="module-detail__brand" type="button" @click="emit('backHome')">
        <span class="module-detail__brand-mark">A</span>
        <span>
          <span class="module-detail__brand-en">{{ APP_ENGLISH_NAME }}</span>
          <strong class="module-detail__brand-name">{{ APP_NAME }}</strong>
        </span>
      </button>

      <nav class="module-detail__nav" aria-label="档案模块">
        <button
          v-for="moduleItem in ARCHIVE_MODULES"
          :key="moduleItem.key"
          class="module-detail__nav-item"
          :class="{ 'module-detail__nav-item--active': moduleItem.key === props.module.key }"
          type="button"
          @click="emit('openModule', moduleItem.key)"
        >
          <span class="module-detail__nav-dot" :class="`module-detail__nav-dot--${moduleItem.tone}`" />
          <span>{{ moduleItem.name }}</span>
          <span class="module-detail__nav-count">{{ moduleCounts[moduleItem.key] }}</span>
        </button>
      </nav>
    </aside>

    <main class="module-detail__main">
      <header class="module-detail__topbar">
        <div class="module-detail__breadcrumb">
          <button class="module-detail__breadcrumb-link" type="button" @click="emit('backHome')">
            个人档案
          </button>
          <span class="module-detail__breadcrumb-separator">/</span>
          <strong class="module-detail__breadcrumb-current">{{ props.module.name }}</strong>
        </div>
        <div class="module-detail__actions">
          <AppButton variant="ghost" @click="emit('backHome')">返回首页</AppButton>
          <AppButton variant="ghost" @click="emit('lock')">锁屏</AppButton>
        </div>
      </header>

      <section class="module-detail__header">
        <div class="module-detail__intro">
          <div class="module-detail__title-row">
            <div>
              <p class="module-detail__eyebrow">Module</p>
              <h1 class="module-detail__title">{{ props.module.name }}</h1>
            </div>
            <span class="module-detail__count-pill">{{ props.items.length }} 条记录</span>
          </div>
          <p class="module-detail__description">{{ props.module.description }}</p>
        </div>
        <form class="module-detail__search" @submit.prevent="handleSearch">
          <AppInput
            v-model="keyword"
            label="模块搜索"
            type="search"
            placeholder="搜索标题、分类、备注"
          />
          <AppButton type="submit" :loading="props.loading">搜索</AppButton>
        </form>
      </section>

      <section class="module-detail__panel">
        <div class="module-detail__panel-head">
          <h2 class="module-detail__panel-title">数据列表</h2>
          <div class="module-detail__panel-tools">
            <AppButton
              v-if="isPasswordModule"
              variant="secondary"
              @click="openCreatePasswordDrawer"
            >
              <el-icon class="module-detail__button-icon"><Plus /></el-icon>
              新增密码
            </AppButton>
            <span class="module-detail__panel-count">{{ props.items.length }} 条</span>
          </div>
        </div>

        <div v-if="props.errorMessage" class="module-detail__empty module-detail__empty--error">
          {{ props.errorMessage }}
        </div>
        <div v-else-if="props.loading" class="module-detail__empty">正在加载模块数据...</div>
        <div v-else-if="props.items.length === 0" class="module-detail__empty">暂无数据</div>

        <div v-else-if="isPasswordModule" class="module-detail__table-wrap module-detail__table-wrap--element">
          <el-table
            class="module-detail__element-table"
            :data="passwordItems"
            border
            :fit="true"
            stripe
            size="large"
          >
            <el-table-column prop="title" label="平台" min-width="170">
              <template #default="{ row }: { row: PasswordListItem }">
                <div class="module-detail__platform-cell">
                  <strong>{{ row.title }}</strong>
                  <el-link
                    v-if="row.loginUrl"
                    type="primary"
                    :href="row.loginUrl"
                    target="_blank"
                    :underline="false"
                  >
                    <el-icon><Link /></el-icon>
                    {{ getLoginUrlHost(row.loginUrl) }}
                  </el-link>
                  <span v-else>{{ row.updatedAt }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="category" label="分类" width="84">
              <template #default="{ row }: { row: PasswordListItem }">
                <el-tag effect="plain" round>{{ row.category }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="登录信息" min-width="150" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                <div class="module-detail__login-cell">
                  <strong>{{ row.account || '-' }}</strong>
                  <span>{{ row.loginMethod || '未填写登录方式' }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="password" label="密码" min-width="124">
              <template #default="{ row }: { row: PasswordListItem }">
                <span class="module-detail__password-cell">
                  <code>{{ getPasswordDisplayText(row) }}</code>
                  <el-tooltip :content="visiblePasswordIds[row.id] ? '隐藏密码' : '查看密码'" placement="top">
                    <el-button
                      circle
                      size="small"
                      text
                      :aria-label="visiblePasswordIds[row.id] ? '隐藏密码' : '查看密码'"
                      @click="togglePasswordVisible(row.id)"
                    >
                      <el-icon>
                        <View v-if="!visiblePasswordIds[row.id]" />
                        <Hide v-else />
                      </el-icon>
                    </el-button>
                  </el-tooltip>
                </span>
              </template>
            </el-table-column>

            <el-table-column label="绑定信息" min-width="130" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                {{ getBindingText(row) }}
              </template>
            </el-table-column>

            <el-table-column prop="remark" min-width="120" show-overflow-tooltip>
              <template #default="{ row }: { row: PasswordListItem }">
                {{ row.remark || '-' }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="190" fixed="right" align="right" header-align="right">
              <template #default="{ row }: { row: PasswordListItem }">
                <div class="module-detail__element-actions">
                  <el-button text type="primary" @click="openViewPasswordDrawer(row)">
                    查看
                  </el-button>
                  <el-button text type="primary" :icon="EditPen" @click="openEditPasswordDrawer(row)">
                    编辑
                  </el-button>
                  <el-popconfirm
                    width="220"
                    title="确认删除这条密码记录？"
                    confirm-button-text="删除"
                    cancel-button-text="取消"
                    confirm-button-type="danger"
                    @confirm="requestDeletePassword(row.id)"
                  >
                    <template #reference>
                      <el-button
                        text
                        type="danger"
                        :icon="Delete"
                        :loading="props.passwordOperationLoading"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <TransitionGroup v-else name="archive-row" tag="div" class="module-detail__file-list">
          <article v-for="item in fileItems" :key="item.id" class="module-detail__file-row">
            <div class="module-detail__file-type">
              <span class="module-detail__file-extension">{{ item.originalName.split('.').pop() || 'file' }}</span>
              <span class="module-detail__file-category">{{ item.category || '未分类' }}</span>
            </div>
            <div class="module-detail__file-content">
              <h3 class="module-detail__file-title">{{ item.title }}</h3>
              <p class="module-detail__file-remark">{{ item.remark || item.originalName }}</p>
            </div>
            <div class="module-detail__file-meta">
              <span>{{ item.mimeType }}</span>
              <span>{{ formatSize(item.size) }}</span>
              <span>{{ item.updatedAt }}</span>
            </div>
          </article>
        </TransitionGroup>
      </section>
    </main>

    <el-drawer
      v-model="passwordDrawerVisible"
      class="module-detail__element-drawer"
      direction="rtl"
      size="520px"
      :close-on-click-modal="!props.passwordOperationLoading"
      :close-on-press-escape="!props.passwordOperationLoading"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <header class="module-detail__drawer-head">
          <div>
            <p class="module-detail__drawer-eyebrow">Password</p>
            <h2 class="module-detail__drawer-title">{{ passwordDrawerTitle }}</h2>
          </div>
          <el-button circle text aria-label="关闭抽屉" @click="closePasswordDrawer">
            <el-icon><Hide /></el-icon>
          </el-button>
        </header>
      </template>

      <el-form
        ref="passwordFormRef"
        class="module-detail__drawer-form module-detail__drawer-form--element"
        :model="passwordForm"
        :rules="passwordFormRules"
        label-position="top"
        hide-required-asterisk
        @submit.prevent="submitPasswordForm"
      >
        <el-form-item label="平台名称" prop="title">
          <el-input v-model="passwordForm.title" placeholder="例如：阿里云控制台" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="passwordForm.category"
            placeholder="选择或输入分类"
            filterable
            allow-create
            default-first-option
            :disabled="isPasswordDrawerReadonly"
          >
            <el-option
              v-for="category in passwordCategoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="登录网址" prop="loginUrl">
          <el-input v-model="passwordForm.loginUrl" placeholder="https://example.com" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item label="登录方式" prop="loginMethod">
          <el-select
            v-model="passwordForm.loginMethod"
            placeholder="选择或输入登录方式"
            filterable
            allow-create
            default-first-option
            :disabled="isPasswordDrawerReadonly"
            clearable
          >
            <el-option
              v-for="method in loginMethodOptions"
              :key="method"
              :label="method"
              :value="method"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="登录账号" prop="account">
          <el-input v-model="passwordForm.account" placeholder="账号、手机号、邮箱或微信号" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            placeholder="明文保存，仅个人查看"
            :disabled="isPasswordDrawerReadonly"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="绑定手机号" prop="phone">
          <el-input v-model="passwordForm.phone" placeholder="可选" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item label="绑定邮箱" prop="email">
          <el-input v-model="passwordForm.email" placeholder="可选" :disabled="isPasswordDrawerReadonly" clearable />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="passwordForm.remark"
            placeholder="补充说明"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="isPasswordDrawerReadonly"
          />
        </el-form-item>

        <el-alert
          v-if="passwordDrawerErrorMessage"
          :title="passwordDrawerErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </el-form>

      <template #footer>
        <div class="module-detail__drawer-actions">
          <el-button @click="closePasswordDrawer">取消</el-button>
          <el-button
            v-if="!isPasswordDrawerReadonly"
            type="primary"
            :loading="props.passwordOperationLoading"
            @click="submitPasswordForm"
          >
            {{ passwordDrawerMode === 'create' ? '新增' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>
