/**
 * 图片预览和下载接口
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { defineEventHandler, getQuery, getRouterParam, setHeader } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById } from '../../utils/database';
import { resolveUploadPath, storedFileExists } from '../../utils/fileStorage';
import { assertAuthenticated, assertQueryUserId } from '../../utils/security';

/**
 * 判断查询参数是否要求下载
 * @param value - 查询参数值
 * @returns 是否下载附件
 * @throws 不主动抛出异常
 */
const isDownloadRequested = (value: unknown): boolean => {
  return value === '1' || value === 'true' || value === true;
};

/**
 * 生成响应头文件名
 * @param fileName - 原始文件名
 * @param download - 是否作为附件下载
 * @returns Content-Disposition 文件名片段
 * @throws 不主动抛出异常
 */
const createContentDisposition = (fileName: string, download: boolean): string => {
  const fallbackName = basename(fileName).replace(/[^\w.-]/g, '-');
  const dispositionType = download ? 'attachment' : 'inline';
  return `${dispositionType}; filename="${fallbackName || 'image'}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('IMAGE_ID_REQUIRED', '图片标识不能为空');
    }

    const session = assertAuthenticated(event);
    const image = getFileAssetById(session.profileId, 'images', id);

    if (!image) {
      return createErrorResponse('IMAGE_NOT_FOUND', '图片文件不存在');
    }

    if (!image.mime_type.startsWith('image/')) {
      return createErrorResponse('IMAGE_TYPE_INVALID', '当前文件不是可预览图片');
    }

    if (!storedFileExists(image.storage_path)) {
      return createErrorResponse('IMAGE_FILE_MISSING', '图片文件不存在');
    }

    const query = getQuery(event);
    const download = isDownloadRequested(query.download);
    setHeader(event, 'Content-Type', image.mime_type);
    setHeader(event, 'Content-Length', image.size);
    setHeader(event, 'Content-Disposition', createContentDisposition(image.original_name, download));
    setHeader(event, 'Cache-Control', 'private, max-age=60');

    const absolutePath = resolveUploadPath(image.storage_path);
    return readFileSync(absolutePath, { encoding: null });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('IMAGE_READ_FAILED', getErrorMessage(error));
  }
});
