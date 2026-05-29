/**
 * 新增文档记录接口
 */

import { randomUUID } from 'node:crypto';
import { defineEventHandler, readBody } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { createFileAsset, deleteFileAsset } from '../../utils/database';
import { parseDocumentPayload, type DocumentRequestBody } from '../../utils/documentPayload';
import {
  buildDocumentStoragePath,
  deleteDocumentTempContent,
  getDocumentMimeType,
  replaceDocumentWithTemp,
  writeDocumentTempContent
} from '../../utils/documentStorage';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const body = await readBody<DocumentRequestBody>(event);
    const session = assertAuthenticated(event);
    const payload = parseDocumentPayload(body);
    const id = randomUUID();
    const storagePath = buildDocumentStoragePath(session.profileId, id, payload.fileType);
    const temporaryFile = writeDocumentTempContent(storagePath, payload.content);
    let assetCreated = false;

    try {
      createFileAsset({
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
      assetCreated = true;
      replaceDocumentWithTemp(temporaryFile.temporaryPath, storagePath);
    } catch (error: unknown) {
      if (assetCreated) {
        deleteFileAsset(id, session.profileId, 'documents');
      }

      deleteDocumentTempContent(temporaryFile.temporaryPath);
      throw error;
    }

    return createSuccessResponse({ id }, '文档新增成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DOCUMENT_CREATE_FAILED', getErrorMessage(error));
  }
});
