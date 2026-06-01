/**
 * 简历文件查看和下载接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById } from '../../utils/database';
import { createStoredFileResponse } from '../../utils/fileResponse';
import { storedFileExists } from '../../utils/fileStorage';
import { assertAuthenticated, assertQueryUserId } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertQueryUserId(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('RESUME_ID_REQUIRED', '简历标识不能为空');
    }

    const session = assertAuthenticated(event);
    const resume = getFileAssetById(session.profileId, 'resumes', id);

    if (!resume) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    if (!storedFileExists(resume.storage_path)) {
      return createErrorResponse('RESUME_FILE_MISSING', '简历文件不存在');
    }

    return createStoredFileResponse(event, resume, false, 'resume');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_DOWNLOAD_FAILED', getErrorMessage(error));
  }
});
