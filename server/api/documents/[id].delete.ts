/**
 * 删除文档记录接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { deleteFileAsset, getFileAssetById } from '../../utils/database';
import { deleteDocumentContent } from '../../utils/documentStorage';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('DOCUMENT_ID_REQUIRED', '文档标识不能为空');
    }

    const session = assertAuthenticated(event);
    const existingDocument = getFileAssetById(session.profileId, 'documents', id);

    if (!existingDocument) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
    }

    const deleted = deleteFileAsset(id, session.profileId, 'documents');

    if (!deleted) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
    }

    deleteDocumentContent(existingDocument.storage_path);

    return createSuccessResponse({ id }, '文档删除成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DOCUMENT_DELETE_FAILED', getErrorMessage(error));
  }
});
