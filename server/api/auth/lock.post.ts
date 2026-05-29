/**
 * 手动锁定个人档案接口
 */

import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { assertCsrfToken, assertValidUserId, clearSessionCookie } from '../../utils/security';

interface LockRequestBody {
  userId?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<LockRequestBody>(event);
    assertValidUserId(body.userId);
    clearSessionCookie(event);

    return createSuccessResponse(null, '已锁定');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('LOCK_FAILED', getErrorMessage(error));
  }
});
