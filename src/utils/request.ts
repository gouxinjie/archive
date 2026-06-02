/**
 * API 请求封装
 */

import { useCookie, useRuntimeConfig } from '#app';
import { $fetch } from 'ofetch';
import type { IFetchError } from 'ofetch';
import { DEFAULT_USER_ID } from '~/constants/app';
import type { ApiResponse, CsrfTokenData } from '~/types/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type UploadHttpMethod = Exclude<HttpMethod, 'GET'>;

interface ArchiveRequestOptions {
  /** 类型：HTTP 方法；含义：请求方法；是否必填：否；默认值：GET */
  method?: HttpMethod;
  /** 类型：对象；含义：请求体；是否必填：否；默认值：undefined */
  body?: Record<string, unknown>;
  /** 类型：对象；含义：查询参数；是否必填：否；默认值：undefined */
  query?: Record<string, string | number | boolean | undefined>;
}

interface ArchiveUploadRequestOptions {
  /** 类型：HTTP 方法；含义：上传请求方法；是否必填：否；默认值：POST */
  method?: UploadHttpMethod;
  /** 类型：对象；含义：查询参数；是否必填：否；默认值：undefined */
  query?: Record<string, string | number | boolean | undefined>;
}

interface ArchiveErrorPayload {
  /** 类型：字符串；含义：服务端返回的错误提示；是否必填：否；默认值：undefined */
  message?: string;
}

const uploadBodyTooLargeMessage =
  '服务器上传大小限制过小（HTTP 413），请将 Nginx 或其他反向代理的请求体上限调到至少 30MB，例如配置 client_max_body_size 30m; 后再重试。';

/**
 * 判断是否为 ofetch 抛出的请求错误
 * @param error - 未知错误对象
 * @returns 是否为请求错误
 * @throws 不抛出异常
 */
const isArchiveFetchError = (error: unknown): error is IFetchError<ArchiveErrorPayload> => {
  return typeof error === 'object' && error !== null && ('status' in error || 'statusCode' in error || 'response' in error);
};

/**
 * 统一规范请求异常提示
 * @param error - 未知错误对象
 * @param fallbackMessage - 默认错误提示
 * @returns 规范化后的错误对象
 * @throws 不抛出异常
 */
const normalizeRequestError = (error: unknown, fallbackMessage: string): Error => {
  if (isArchiveFetchError(error)) {
    const apiMessage = typeof error.data?.message === 'string' ? error.data.message.trim() : '';

    if (apiMessage) {
      return new Error(apiMessage);
    }

    const statusCode = error.statusCode || error.status || error.response?.status;

    if (statusCode === 413) {
      return new Error(uploadBodyTooLargeMessage);
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error;
  }

  return new Error(fallbackMessage);
};

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
    try {
      return await $fetch<ApiResponse<T>>(url, {
        method,
        query: {
          userId,
          ...options.query
        }
      });
    } catch (error: unknown) {
      throw normalizeRequestError(error, '请求失败');
    }
  }

  const csrfToken = await ensureCsrfToken();

  try {
    return await $fetch<ApiResponse<T>>(url, {
      method,
      headers: {
        'x-csrf-token': csrfToken
      },
      body: {
        userId,
        ...options.body
      }
    });
  } catch (error: unknown) {
    throw normalizeRequestError(error, '请求失败');
  }
};

/**
 * 发起 multipart 文件上传请求
 * @param url - 接口地址
 * @param body - FormData 请求体
 * @param options - 上传请求配置
 * @returns 统一 API 响应
 * @throws 当网络请求失败时抛出错误
 */
export const uploadRequest = async <T>(url: string, body: FormData, options: ArchiveUploadRequestOptions = {}): Promise<ApiResponse<T>> => {
  const method = options.method || 'POST';
  const userId = getArchiveUserId();

  if (!body.has('userId')) {
    body.append('userId', userId);
  }

  const csrfToken = await ensureCsrfToken();

  try {
    return await $fetch<ApiResponse<T>>(url, {
      method,
      headers: {
        'x-csrf-token': csrfToken
      },
      query: options.query,
      body
    });
  } catch (error: unknown) {
    throw normalizeRequestError(error, '文件上传失败');
  }
};
