/**
 * 手动锁定个人档案接口
 */

import { defineEventHandler } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { assertCsrfToken, clearSessionCookie } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);
    clearSessionCookie(event);

    return createSuccessResponse(null, '已锁定');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('LOCK_FAILED', getErrorMessage(error));
  }
});
