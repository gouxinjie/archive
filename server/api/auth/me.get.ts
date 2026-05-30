/**
 * 查询当前登录用户接口
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
      userId: session?.userId || null,
      username: session?.username || null,
      displayName: session?.displayName || null,
      profileId: session?.profileId || null,
      profileName: session?.profileName || null
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('AUTH_ME_FAILED', getErrorMessage(error));
  }
});
