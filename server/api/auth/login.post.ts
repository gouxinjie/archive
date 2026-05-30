/**
 * 账号登录接口
 */

import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { assertCsrfToken, matchUserByCredentials, setSessionCookie } from '../../utils/security';

interface LoginRequestBody {
  username?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<LoginRequestBody>(event);

    if (typeof body.username !== 'string' || !body.username.trim()) {
      return createErrorResponse('USERNAME_INVALID', '请输入登录账号');
    }

    if (typeof body.password !== 'string' || body.password.length < 6) {
      return createErrorResponse('PASSWORD_INVALID', '请输入至少 6 位登录密码');
    }

    const session = await matchUserByCredentials(body.username, body.password);

    if (!session) {
      return createErrorResponse('LOGIN_FAILED', '账号或密码错误');
    }

    setSessionCookie(event, session);
    return createSuccessResponse(session, `已登录 ${session.displayName}`);
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('LOGIN_FAILED', getErrorMessage(error));
  }
});
