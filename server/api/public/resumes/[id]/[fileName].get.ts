/**
 * 简历文件公开短时访问接口
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { defineEventHandler, getQuery, getRouterParam, setHeader } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../../../utils/apiResponse';
import { getFileAssetById } from '../../../../utils/database';
import { resolveUploadPath, storedFileExists } from '../../../../utils/fileStorage';
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

/**
 * 生成 inline 响应头中的安全文件名
 * @param fileName - 原始文件名
 * @returns Content-Disposition 文件名片段
 * @throws 不主动抛出异常
 */
const createContentDisposition = (fileName: string): string => {
  const fallbackName = basename(fileName).replace(/[^\w.-]/g, '-');
  return `inline; filename="${fallbackName || 'resume'}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
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

    setHeader(event, 'Content-Type', resume.mime_type);
    setHeader(event, 'Content-Length', resume.size);
    setHeader(event, 'Content-Disposition', createContentDisposition(resume.original_name));
    setHeader(event, 'Cache-Control', 'private, max-age=600');

    return readFileSync(resolveUploadPath(resume.storage_path), { encoding: null });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_PUBLIC_FILE_FAILED', getErrorMessage(error));
  }
});
