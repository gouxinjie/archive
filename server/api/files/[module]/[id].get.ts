/**
 * 证件或学习资料文件预览和下载接口
 */

import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../../utils/apiResponse';
import { getFileAssetById } from '../../../utils/database';
import { isEditableFileModuleKey, toArchiveModuleKey } from '../../../utils/fileAssetPayload';
import { createStoredFileResponse, isDownloadRequested } from '../../../utils/fileResponse';
import { storedFileExists } from '../../../utils/fileStorage';
import { assertAuthenticated, assertQueryUserId, assertSessionDownloadable } from '../../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);

    const moduleKey = getRouterParam(event, 'module');
    const id = getRouterParam(event, 'id');

    if (!isEditableFileModuleKey(moduleKey)) {
      return createErrorResponse('FILE_MODULE_INVALID', '当前模块不支持文件读取');
    }

    if (!id) {
      return createErrorResponse('FILE_ID_REQUIRED', '文件标识不能为空');
    }

    const archiveModuleKey = toArchiveModuleKey(moduleKey);
    const session = assertAuthenticated(event);
    const file = getFileAssetById(session.profileId, archiveModuleKey, id);

    if (!file) {
      return createErrorResponse('FILE_NOT_FOUND', '文件记录不存在');
    }

    if (!storedFileExists(file.storage_path)) {
      return createErrorResponse('FILE_MISSING', '文件不存在');
    }

    const query = getQuery(event);
    const download = isDownloadRequested(query.download);

    if (download) {
      assertSessionDownloadable(session);
    }

    return createStoredFileResponse(event, file, download, 'file');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('FILE_READ_FAILED', getErrorMessage(error));
  }
});
