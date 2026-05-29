/**
 * 查询个人档案解锁状态接口
 */

import { defineEventHandler, getCookie } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { hasMasterPassword, isAuthenticated, verifySessionToken } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const session = verifySessionToken(getCookie(event, 'archive_session'));

    return createSuccessResponse({
      hasPassword: hasMasterPassword(),
      authenticated: isAuthenticated(event),
      profileId: session?.profileId || null,
      profileName: session?.profileName || null
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('AUTH_STATUS_FAILED', getErrorMessage(error));
  }
});
