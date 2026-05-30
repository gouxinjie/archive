/**
 * 首次设置个人密码接口
 */

import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { setSetting } from '../../utils/database';
import {
  assertCsrfToken,
  assertValidUserId,
  getMasterPasswordSettingKey,
  hasMasterPassword,
  hashPassword,
  setSessionCookie
} from '../../utils/security';

interface SetupRequestBody {
  userId?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<SetupRequestBody>(event);
    const userId = assertValidUserId(body.userId);

    if (hasMasterPassword()) {
      return createErrorResponse('PASSWORD_EXISTS', '个人密码已经设置');
    }

    if (typeof body.password !== 'string' || body.password.trim().length < 6) {
      return createErrorResponse('PASSWORD_INVALID', '个人密码至少需要 6 位');
    }

    const hashedPassword = await hashPassword(body.password);
    setSetting(getMasterPasswordSettingKey(), hashedPassword);
    setSessionCookie(event, {
      userId,
      username: userId,
      displayName: '个人档案',
      profileId: userId,
      profileName: '个人档案'
    });

    return createSuccessResponse(null, '个人密码设置成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_SETUP_FAILED', getErrorMessage(error));
  }
});
