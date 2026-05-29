/**
 * 首页统计接口
 */

import { defineEventHandler } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { countFilesByModule, countPasswords } from '../../utils/database';
import { assertAuthenticated, assertQueryUserId } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const userId = assertQueryUserId(event);
    assertAuthenticated(event, userId);

    return createSuccessResponse({
      passwordCount: countPasswords(userId),
      documentCount: countFilesByModule(userId, 'documents'),
      resumeCount: countFilesByModule(userId, 'resumes'),
      imageCount: countFilesByModule(userId, 'images'),
      certificateCount: countFilesByModule(userId, 'certificates'),
      studyCount: countFilesByModule(userId, 'study')
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DASHBOARD_SUMMARY_FAILED', getErrorMessage(error));
  }
});
