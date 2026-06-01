/**
 * 新增证件或学习资料文件接口
 */

import { randomUUID } from 'node:crypto';
import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../../utils/apiResponse';
import { createFileAsset, deleteFileAsset } from '../../../utils/database';
import { isEditableFileModuleKey, parseGenericFileUploadForm, toArchiveModuleKey } from '../../../utils/fileAssetPayload';
import {
  buildModuleFileStoragePath,
  deleteBinaryTempFile,
  replaceStoredFileWithTemp,
  writeBinaryTempFile
} from '../../../utils/fileStorage';
import { assertAuthenticated, assertCsrfToken } from '../../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const moduleKey = getRouterParam(event, 'module');

    if (!isEditableFileModuleKey(moduleKey)) {
      return createErrorResponse('FILE_MODULE_INVALID', '当前模块不支持文件上传');
    }

    const session = assertAuthenticated(event);
    const formData = await readMultipartFormData(event);
    const payload = parseGenericFileUploadForm(moduleKey, formData);
    const id = randomUUID();
    const archiveModuleKey = toArchiveModuleKey(moduleKey);
    const storagePath = buildModuleFileStoragePath(session.profileId, archiveModuleKey, id, payload.fileType);
    const temporaryFile = writeBinaryTempFile(storagePath, payload.content);
    let assetCreated = false;

    try {
      createFileAsset({
        id,
        profileId: session.profileId,
        module: archiveModuleKey,
        category: payload.category,
        title: payload.title,
        originalName: payload.originalName,
        storagePath,
        mimeType: payload.mimeType,
        size: temporaryFile.size,
        remark: payload.remark
      });
      assetCreated = true;
      replaceStoredFileWithTemp(temporaryFile.temporaryPath, storagePath);
    } catch (error: unknown) {
      if (assetCreated) {
        deleteFileAsset(id, session.profileId, archiveModuleKey);
      }

      deleteBinaryTempFile(temporaryFile.temporaryPath);
      throw error;
    }

    return createSuccessResponse({ id }, '文件上传成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('FILE_CREATE_FAILED', getErrorMessage(error));
  }
});
