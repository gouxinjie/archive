/**
 * 简历文件查看和下载接口
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { defineEventHandler, getRouterParam, setHeader } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById } from '../../utils/database';
import { resolveUploadPath, storedFileExists } from '../../utils/fileStorage';
import { assertAuthenticated, assertQueryUserId } from '../../utils/security';

/**
 * 生成下载响应头文件名
 * @param fileName - 原始文件名
 * @returns Content-Disposition 文件名片段
 * @throws 不抛出异常
 */
const createContentDisposition = (fileName: string): string => {
  const fallbackName = basename(fileName).replace(/[^\w.-]/g, '-');
  return `inline; filename="${fallbackName || 'resume'}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

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

    setHeader(event, 'Content-Type', resume.mime_type);
    setHeader(event, 'Content-Length', resume.size);
    setHeader(event, 'Content-Disposition', createContentDisposition(resume.original_name));

    const absolutePath = resolveUploadPath(resume.storage_path);
    return readFileSync(absolutePath, { encoding: null });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_DOWNLOAD_FAILED', getErrorMessage(error));
  }
});
