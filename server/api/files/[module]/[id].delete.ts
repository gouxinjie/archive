/**
 * 删除证件或学习资料文件接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../../utils/apiResponse';
import { deleteFileAsset, getFileAssetById } from '../../../utils/database';
import { isEditableFileModuleKey, toArchiveModuleKey } from '../../../utils/fileAssetPayload';
import { deleteStoredFile } from '../../../utils/fileStorage';
import { assertAuthenticated, assertCsrfToken } from '../../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const moduleKey = getRouterParam(event, 'module');
    const id = getRouterParam(event, 'id');

    if (!isEditableFileModuleKey(moduleKey)) {
      return createErrorResponse('FILE_MODULE_INVALID', '当前模块不支持文件删除');
    }

    if (!id) {
      return createErrorResponse('FILE_ID_REQUIRED', '文件标识不能为空');
    }

    const archiveModuleKey = toArchiveModuleKey(moduleKey);
    const session = assertAuthenticated(event);
    const existingFile = getFileAssetById(session.profileId, archiveModuleKey, id);

    if (!existingFile) {
      return createErrorResponse('FILE_NOT_FOUND', '文件记录不存在');
    }

    const deleted = deleteFileAsset(id, session.profileId, archiveModuleKey);

    if (!deleted) {
      return createErrorResponse('FILE_NOT_FOUND', '文件记录不存在');
    }

    deleteStoredFile(existingFile.storage_path);

    return createSuccessResponse({ id }, '文件删除成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('FILE_DELETE_FAILED', getErrorMessage(error));
  }
});
