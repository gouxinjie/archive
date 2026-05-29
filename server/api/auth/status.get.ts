/**
 * 查询个人档案解锁状态接口
 */

import { defineEventHandler } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { assertQueryUserId, hasMasterPassword, isAuthenticated } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const userId = assertQueryUserId(event);

    return createSuccessResponse({
      hasPassword: hasMasterPassword(),
      authenticated: isAuthenticated(event, userId)
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('AUTH_STATUS_FAILED', getErrorMessage(error));
  }
});
