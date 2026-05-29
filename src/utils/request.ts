/**
 * API 请求封装
 */

import { useCookie, useRuntimeConfig } from '#app';
import { $fetch } from 'ofetch';
import { DEFAULT_USER_ID } from '~/constants/app';
import type { ApiResponse, CsrfTokenData } from '~/types/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ArchiveRequestOptions {
  /** 类型：HTTP 方法；含义：请求方法；是否必填：否；默认值：GET */
  method?: HttpMethod;
  /** 类型：对象；含义：请求体；是否必填：否；默认值：undefined */
  body?: Record<string, unknown>;
  /** 类型：对象；含义：查询参数；是否必填：否；默认值：undefined */
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * 获取单人系统的用户标识
 * @returns 用户标识
 * @throws 不抛出异常
 */
export const getArchiveUserId = (): string => {
  const config = useRuntimeConfig();
  return config.public.ownerUserId || DEFAULT_USER_ID;
};

/**
 * 确保浏览器端存在 CSRF 令牌
 * @returns CSRF 令牌
 * @throws 当服务端无法返回令牌时抛出错误
 */
export const ensureCsrfToken = async (): Promise<string> => {
  const csrfCookie = useCookie<string | null>('archive_csrf');

  if (csrfCookie.value) {
    return csrfCookie.value;
  }

  const response = await $fetch<ApiResponse<CsrfTokenData>>('/api/security/csrf', {
    method: 'GET',
    query: { userId: getArchiveUserId() }
  });

  if (!response.success) {
    throw new Error(response.message);
  }

  return response.data.token;
};

/**
 * 发起统一 API 请求
 * @param url - 接口地址
 * @param options - 请求配置
 * @returns 统一 API 响应
 * @throws 当网络请求失败时抛出错误
 */
export const request = async <T>(url: string, options: ArchiveRequestOptions = {}): Promise<ApiResponse<T>> => {
  const method = options.method || 'GET';
  const userId = getArchiveUserId();

  if (method === 'GET') {
    return $fetch<ApiResponse<T>>(url, {
      method,
      query: {
        userId,
        ...options.query
      }
    });
  }

  const csrfToken = await ensureCsrfToken();

  return $fetch<ApiResponse<T>>(url, {
    method,
    headers: {
      'x-csrf-token': csrfToken
    },
    body: {
      userId,
      ...options.body
    }
  });
};
