/**
 * 查询文档详情接口
 */

import { defineEventHandler, getRouterParam } from 'h3';
import type { ArchiveModuleKey, DocumentDetailData } from '../../../src/types/models';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById } from '../../utils/database';
import { getDocumentFileMeta, readDocumentContent } from '../../utils/documentStorage';
import { assertAuthenticated } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('DOCUMENT_ID_REQUIRED', '文档标识不能为空');
    }

    const session = assertAuthenticated(event);
    const document = getFileAssetById(session.profileId, 'documents', id);

    if (!document) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', '文档记录不存在');
    }

    const documentMeta = getDocumentFileMeta(document);
    const data: DocumentDetailData = {
      id: document.id,
      module: document.module as ArchiveModuleKey,
      category: document.category,
      title: document.title,
      originalName: document.original_name,
      storagePath: document.storage_path,
      mimeType: documentMeta.mimeType,
      size: document.size,
      remark: document.remark,
      updatedAt: document.updated_at,
      fileType: documentMeta.fileType,
      content: readDocumentContent(document.storage_path)
    };

    return createSuccessResponse<DocumentDetailData>(data);
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('DOCUMENT_DETAIL_FAILED', getErrorMessage(error));
  }
});
