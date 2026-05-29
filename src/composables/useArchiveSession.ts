/**
 * 个人档案会话状态组合函数
 */

import { computed } from 'vue';
import { request } from '~/utils/request';
import type { ApiResponse, AuthStatusData } from '~/types/api';

interface UnlockResult {
  /** 类型：布尔值；含义：操作是否成功；是否必填：是；默认值：false */
  success: boolean;
  /** 类型：字符串；含义：操作提示；是否必填：是；默认值：空字符串 */
  message: string;
}

/**
 * 管理个人档案的解锁状态
 * @returns 会话状态和操作函数
 * @throws 不主动抛出异常，错误写入 errorMessage
 */
export const useArchiveSession = () => {
  const status = useState<AuthStatusData>('archive-session-status', () => ({
    hasPassword: false,
    authenticated: false
  }));
  const loading = useState<boolean>('archive-session-loading', () => false);
  const initialized = useState<boolean>('archive-session-initialized', () => false);
  const errorMessage = useState<string>('archive-session-error', () => '');

  const isReady = computed<boolean>(() => initialized.value && !loading.value);
  const needsSetup = computed<boolean>(() => !status.value.hasPassword);
  const authenticated = computed<boolean>(() => status.value.authenticated);

  const loadStatus = async (): Promise<void> => {
    loading.value = true;
    errorMessage.value = '';

    try {
      const response = await request<AuthStatusData>('/api/auth/status');

      if (!response.success) {
        errorMessage.value = response.message;
        return;
      }

      status.value = response.data;
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : '获取解锁状态失败';
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  };

  const setupPassword = async (password: string): Promise<UnlockResult> => {
    const response = await submitPassword('/api/auth/setup', password);
    await loadStatus();
    return response;
  };

  const unlock = async (password: string): Promise<UnlockResult> => {
    const response = await submitPassword('/api/auth/unlock', password);
    await loadStatus();
    return response;
  };

  const lock = async (): Promise<void> => {
    await request<null>('/api/auth/lock', { method: 'POST' });
    await loadStatus();
  };

  const submitPassword = async (url: string, password: string): Promise<UnlockResult> => {
    loading.value = true;
    errorMessage.value = '';

    try {
      const response: ApiResponse<null> = await request<null>(url, {
        method: 'POST',
        body: { password }
      });

      if (!response.success) {
        errorMessage.value = response.message;
        return { success: false, message: response.message };
      }

      return { success: true, message: response.message };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '操作失败';
      errorMessage.value = message;
      return { success: false, message };
    } finally {
      loading.value = false;
    }
  };

  return {
    status,
    loading,
    initialized,
    errorMessage,
    isReady,
    needsSetup,
    authenticated,
    loadStatus,
    setupPassword,
    unlock,
    lock
  };
};
