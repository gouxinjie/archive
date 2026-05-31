/**
 * 删除图片文件接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { deleteFileAsset, getFileAssetById } from '../../utils/database';
import { deleteStoredFile } from '../../utils/fileStorage';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('IMAGE_ID_REQUIRED', '图片标识不能为空');
    }

    const session = assertAuthenticated(event);
    const existingImage = getFileAssetById(session.profileId, 'images', id);

    if (!existingImage) {
      return createErrorResponse('IMAGE_NOT_FOUND', '图片文件不存在');
    }

    const deleted = deleteFileAsset(id, session.profileId, 'images');

    if (!deleted) {
      return createErrorResponse('IMAGE_NOT_FOUND', '图片文件不存在');
    }

    deleteStoredFile(existingImage.storage_path);

    return createSuccessResponse({ id }, '图片删除成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('IMAGE_DELETE_FAILED', getErrorMessage(error));
  }
});
