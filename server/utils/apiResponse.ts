/**
 * API 统一响应工具
 */

export interface ApiSuccessResponse<T> {
  success: true;
  code: 200;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  data: null;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 创建成功响应
 * @param data - 响应数据
 * @param message - 成功提示
 * @returns 统一成功响应
 * @throws 不抛出异常
 */
export const createSuccessResponse = <T>(data: T, message = '操作成功'): ApiSuccessResponse<T> => {
  return {
    success: true,
    code: 200,
    message,
    data
  };
};

/**
 * 创建失败响应
 * @param code - 业务错误码
 * @param message - 中文错误提示
 * @returns 统一失败响应
 * @throws 不抛出异常
 */
export const createErrorResponse = (code: string, message: string): ApiErrorResponse => {
  return {
    success: false,
    code,
    message,
    data: null
  };
};

/**
 * 提取未知错误的可读信息
 * @param error - 未知错误对象
 * @returns 错误信息
 * @throws 不抛出异常
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return '未知错误';
};
