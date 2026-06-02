/**
 * 新增密码记录接口
 */

import { randomUUID } from 'node:crypto';
import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { createPasswordItem } from '../../utils/database';
import { parsePasswordPayload, type PasswordRequestBody } from '../../utils/passwordPayload';
import { assertAuthenticatedWritable, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<PasswordRequestBody>(event);
    const session = assertAuthenticatedWritable(event);

    const payload = parsePasswordPayload(body);
    const id = createPasswordItem({
      id: randomUUID(),
      profileId: session.profileId,
      ...payload
    });

    return createSuccessResponse({ id }, '密码记录新增成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_CREATE_FAILED', getErrorMessage(error));
  }
});
