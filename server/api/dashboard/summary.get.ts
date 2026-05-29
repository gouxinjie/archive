/**
 * 首页统计接口
 */

import { defineEventHandler } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { countFilesByModule, countPasswords } from '../../utils/database';
import { assertAuthenticated } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const session = assertAuthenticated(event);
    const profileId = session.profileId;

    return createSuccessResponse({
      passwordCount: countPasswords(profileId),
      documentCount: countFilesByModule(profileId, 'documents'),
      resumeCount: countFilesByModule(profileId, 'resumes'),
      imageCount: countFilesByModule(profileId, 'images'),
      certificateCount: countFilesByModule(profileId, 'certificates'),
      studyCount: countFilesByModule(profileId, 'study')
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DASHBOARD_SUMMARY_FAILED', getErrorMessage(error));
  }
});
