/**
 * 个人密码解锁接口
 */

import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import {
  assertCsrfToken,
  assertValidUserId,
  getMasterPasswordHash,
  setSessionCookie,
  verifyPassword
} from '../../utils/security';

interface UnlockRequestBody {
  userId?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<UnlockRequestBody>(event);
    const userId = assertValidUserId(body.userId);
    const hashedPassword = getMasterPasswordHash();

    if (!hashedPassword) {
      return createErrorResponse('PASSWORD_NOT_SET', '请先设置个人密码');
    }

    if (typeof body.password !== 'string') {
      return createErrorResponse('PASSWORD_INVALID', '请输入个人密码');
    }

    const matched = await verifyPassword(body.password, hashedPassword);

    if (!matched) {
      return createErrorResponse('PASSWORD_INCORRECT', '个人密码错误');
    }

    setSessionCookie(event, userId);
    return createSuccessResponse(null, '解锁成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_UNLOCK_FAILED', getErrorMessage(error));
  }
});
