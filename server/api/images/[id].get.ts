/**
 * 图片预览和下载接口
 */

import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById } from '../../utils/database';
import { createStoredFileResponse, isDownloadRequested } from '../../utils/fileResponse';
import { storedFileExists } from '../../utils/fileStorage';
import { assertAuthenticated, assertQueryUserId } from '../../utils/security';

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
    return createStoredFileResponse(event, image, download, 'image');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('IMAGE_READ_FAILED', getErrorMessage(error));
  }
});
