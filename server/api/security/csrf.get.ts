/**
 * 获取 CSRF 令牌接口
 */

import { defineEventHandler } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { assertQueryUserId, ensureCsrfCookie } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);
    const token = ensureCsrfCookie(event);
    return createSuccessResponse({ token });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('CSRF_TOKEN_FAILED', getErrorMessage(error));
  }
});
