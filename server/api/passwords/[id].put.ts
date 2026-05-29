/**
 * 更新密码记录接口
 */

import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { updatePasswordItem } from '../../utils/database';
import { parsePasswordPayload, type PasswordRequestBody } from '../../utils/passwordPayload';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('PASSWORD_ID_REQUIRED', '密码记录标识不能为空');
    }

    const body = await readBody<PasswordRequestBody>(event);
    const session = assertAuthenticated(event);

    const payload = parsePasswordPayload(body);
    const updated = updatePasswordItem({
      id,
      profileId: session.profileId,
      ...payload
    });

    if (!updated) {
      return createErrorResponse('PASSWORD_NOT_FOUND', '密码记录不存在');
    }

    return createSuccessResponse({ id }, '密码记录更新成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_UPDATE_FAILED', getErrorMessage(error));
  }
});
