/**
 * 查询个人档案登录状态接口
 */

import { defineEventHandler, getCookie } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import {
  getSessionReadOnlyMessage,
  hasMasterPassword,
  isAuthenticated,
  isDemoArchiveSession,
  verifySessionToken
} from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const session = verifySessionToken(getCookie(event, 'archive_session'));
    const readOnlyMessage = getSessionReadOnlyMessage(session);

    return createSuccessResponse({
      hasPassword: hasMasterPassword(),
      authenticated: isAuthenticated(event),
      userId: session?.userId || null,
      username: session?.username || null,
      displayName: session?.displayName || null,
      profileId: session?.profileId || null,
      profileName: session?.profileName || null,
      isDemoAccount: isDemoArchiveSession(session),
      readOnly: Boolean(readOnlyMessage),
      readOnlyMessage
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('AUTH_STATUS_FAILED', getErrorMessage(error));
  }
});
