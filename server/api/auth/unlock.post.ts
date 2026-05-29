/**
 * 个人密码解锁接口
 */

import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import {
  assertCsrfToken,
  matchArchiveProfileByPassword,
  setSessionCookie,
} from '../../utils/security';

interface UnlockRequestBody {
  userId?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<UnlockRequestBody>(event);

    if (typeof body.password !== 'string') {
      return createErrorResponse('PASSWORD_INVALID', '请输入档案密码');
    }

    const profile = await matchArchiveProfileByPassword(body.password);

    if (!profile) {
      return createErrorResponse('PASSWORD_INCORRECT', '档案密码错误');
    }

    setSessionCookie(event, profile);
    return createSuccessResponse(profile, `已进入${profile.profileName}`);
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_UNLOCK_FAILED', getErrorMessage(error));
  }
});
