/**
 * 删除简历文件接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { deleteFileAsset, getFileAssetById } from '../../utils/database';
import { deleteStoredFile } from '../../utils/fileStorage';
import { assertAuthenticatedWritable, assertCsrfToken } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('RESUME_ID_REQUIRED', '简历标识不能为空');
    }

    const session = assertAuthenticatedWritable(event);
    const existingResume = getFileAssetById(session.profileId, 'resumes', id);

    if (!existingResume) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    const deleted = deleteFileAsset(id, session.profileId, 'resumes');

    if (!deleted) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    deleteStoredFile(existingResume.storage_path);

    return createSuccessResponse({ id }, '简历删除成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_DELETE_FAILED', getErrorMessage(error));
  }
});
