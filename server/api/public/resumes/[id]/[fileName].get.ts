/**
 * 简历文件公开短时访问接口
 */

import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../../../utils/apiResponse';
import { getFileAssetById } from '../../../../utils/database';
import { createStoredFileResponse } from '../../../../utils/fileResponse';
import { storedFileExists } from '../../../../utils/fileStorage';
import { assertValidUserId, verifyFilePreviewToken } from '../../../../utils/security';

/**
 * 获取单个查询参数文本值
 * @param value - 查询参数原始值
 * @returns 查询参数文本值
 * @throws 不主动抛出异常
 */
const getQueryText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
};

export default defineEventHandler((event) => {
  try {
    const query = getQuery(event);
    assertValidUserId(query.userId);

    const id = getRouterParam(event, 'id');
    const token = getQueryText(query.token);
    const previewPayload = verifyFilePreviewToken(token);

    if (!id) {
      return createErrorResponse('RESUME_ID_REQUIRED', '简历标识不能为空');
    }

    if (!previewPayload || previewPayload.fileId !== id || previewPayload.module !== 'resumes') {
      return createErrorResponse('RESUME_PREVIEW_TOKEN_INVALID', '简历预览链接已失效');
    }

    const resume = getFileAssetById(previewPayload.profileId, 'resumes', id);

    if (!resume) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    if (!storedFileExists(resume.storage_path)) {
      return createErrorResponse('RESUME_FILE_MISSING', '简历文件不存在');
    }

    return createStoredFileResponse(event, resume, false, 'resume', 'private, max-age=600');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_PUBLIC_FILE_FAILED', getErrorMessage(error));
  }
});
