/**
 * 更新文档记录接口
 */

import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById, updateFileAsset } from '../../utils/database';
import { parseDocumentPayload, type DocumentRequestBody } from '../../utils/documentPayload';
import {
  buildDocumentStoragePath,
  deleteDocumentContent,
  deleteDocumentTempContent,
  getDocumentMimeType,
  replaceDocumentWithTemp,
  writeDocumentTempContent
} from '../../utils/documentStorage';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('DOCUMENT_ID_REQUIRED', '文档标识不能为空');
    }

    const body = await readBody<DocumentRequestBody>(event);
    const session = assertAuthenticated(event);
    const existingDocument = getFileAssetById(session.profileId, 'documents', id);

    if (!existingDocument) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
    }

    const payload = parseDocumentPayload(body);
    const storagePath = buildDocumentStoragePath(session.profileId, id, payload.fileType);
    const temporaryFile = writeDocumentTempContent(storagePath, payload.content);
    let updated = false;

    try {
      updated = updateFileAsset({
        id,
        profileId: session.profileId,
        module: 'documents',
        category: payload.category,
        title: payload.title,
        originalName: payload.originalName,
        storagePath,
        mimeType: getDocumentMimeType(payload.fileType),
        size: temporaryFile.size,
        remark: payload.remark
      });

      if (!updated) {
        deleteDocumentTempContent(temporaryFile.temporaryPath);
        return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
      }

      replaceDocumentWithTemp(temporaryFile.temporaryPath, storagePath);
    } catch (error: unknown) {
      if (updated) {
        updateFileAsset({
          id,
          profileId: session.profileId,
          module: 'documents',
          category: existingDocument.category,
          title: existingDocument.title,
          originalName: existingDocument.original_name,
          storagePath: existingDocument.storage_path,
          mimeType: existingDocument.mime_type,
          size: existingDocument.size,
          remark: existingDocument.remark
        });
      }

      deleteDocumentTempContent(temporaryFile.temporaryPath);
      throw error;
    }

    if (existingDocument.storage_path !== storagePath) {
      deleteDocumentContent(existingDocument.storage_path);
    }

    return createSuccessResponse({ id }, '文档更新成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DOCUMENT_UPDATE_FAILED', getErrorMessage(error));
  }
});
