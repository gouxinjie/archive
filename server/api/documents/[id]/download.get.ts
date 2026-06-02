/**
 * 文档文件下载接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../../utils/apiResponse';
import { getFileAssetById } from '../../../utils/database';
import { createStoredFileResponse } from '../../../utils/fileResponse';
import { storedFileExists } from '../../../utils/fileStorage';
import { assertAuthenticatedDownloadable, assertQueryUserId } from '../../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('DOCUMENT_ID_REQUIRED', '文档标识不能为空');
    }

    const session = assertAuthenticatedDownloadable(event);
    const document = getFileAssetById(session.profileId, 'documents', id);

    if (!document) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
    }

    if (!storedFileExists(document.storage_path)) {
      return createErrorResponse('DOCUMENT_FILE_MISSING', '文档文件不存在');
    }

    return createStoredFileResponse(event, document, true, 'document');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DOCUMENT_DOWNLOAD_FAILED', getErrorMessage(error));
  }
});
