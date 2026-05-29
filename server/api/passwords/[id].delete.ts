/**
 * 删除密码记录接口
 */

import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { deletePasswordItem } from '../../utils/database';
import { assertAuthenticated, assertCsrfToken, assertValidUserId } from '../../utils/security';

interface DeletePasswordRequestBody {
  userId?: unknown;
}

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('PASSWORD_ID_REQUIRED', '密码记录标识不能为空');
    }

    const body = await readBody<DeletePasswordRequestBody>(event);
    const userId = assertValidUserId(body.userId);
    assertAuthenticated(event, userId);

    const deleted = deletePasswordItem(id, userId);

    if (!deleted) {
      return createErrorResponse('PASSWORD_NOT_FOUND', '密码记录不存在');
    }

    return createSuccessResponse({ id }, '密码记录删除成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_DELETE_FAILED', getErrorMessage(error));
  }
});
