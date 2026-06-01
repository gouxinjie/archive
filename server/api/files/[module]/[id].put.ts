/**
 * 更新证件或学习资料文件接口
 */

import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../../utils/apiResponse';
import { getFileAssetById, updateFileAsset } from '../../../utils/database';
import { isEditableFileModuleKey, parseGenericFileUpdateForm, toArchiveModuleKey } from '../../../utils/fileAssetPayload';
import {
  buildModuleFileStoragePath,
  deleteBinaryTempFile,
  deleteStoredFile,
  replaceStoredFileWithTemp,
  writeBinaryTempFile
} from '../../../utils/fileStorage';
import { assertAuthenticated, assertCsrfToken } from '../../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const moduleKey = getRouterParam(event, 'module');
    const id = getRouterParam(event, 'id');

    if (!isEditableFileModuleKey(moduleKey)) {
      return createErrorResponse('FILE_MODULE_INVALID', '当前模块不支持文件编辑');
    }

    if (!id) {
      return createErrorResponse('FILE_ID_REQUIRED', '文件标识不能为空');
    }

    const archiveModuleKey = toArchiveModuleKey(moduleKey);
    const formData = await readMultipartFormData(event);
    const session = assertAuthenticated(event);
    const existingFile = getFileAssetById(session.profileId, archiveModuleKey, id);

    if (!existingFile) {
      return createErrorResponse('FILE_NOT_FOUND', '文件记录不存在');
    }

    const payload = parseGenericFileUpdateForm(moduleKey, formData);
    const replacementFile = payload.replacementFile;
    const storagePath = replacementFile
      ? buildModuleFileStoragePath(session.profileId, archiveModuleKey, id, replacementFile.fileType)
      : existingFile.storage_path;
    const temporaryFile = replacementFile ? writeBinaryTempFile(storagePath, replacementFile.content) : null;
    let updated = false;

    try {
      updated = updateFileAsset({
        id,
        profileId: session.profileId,
        module: archiveModuleKey,
        category: payload.category,
        title: payload.title,
        originalName: replacementFile?.originalName || existingFile.original_name,
        storagePath,
        mimeType: replacementFile?.mimeType || existingFile.mime_type,
        size: replacementFile?.size || existingFile.size,
        remark: payload.remark
      });

      if (!updated) {
        if (temporaryFile) {
          deleteBinaryTempFile(temporaryFile.temporaryPath);
        }

        return createErrorResponse('FILE_NOT_FOUND', '文件记录不存在');
      }

      if (temporaryFile) {
        replaceStoredFileWithTemp(temporaryFile.temporaryPath, storagePath);
      }
    } catch (error: unknown) {
      if (updated) {
        updateFileAsset({
          id,
          profileId: session.profileId,
          module: archiveModuleKey,
          category: existingFile.category,
          title: existingFile.title,
          originalName: existingFile.original_name,
          storagePath: existingFile.storage_path,
          mimeType: existingFile.mime_type,
          size: existingFile.size,
          remark: existingFile.remark
        });
      }

      if (temporaryFile) {
        deleteBinaryTempFile(temporaryFile.temporaryPath);
      }

      throw error;
    }

    if (replacementFile && existingFile.storage_path !== storagePath) {
      deleteStoredFile(existingFile.storage_path);
    }

    return createSuccessResponse({ id }, '文件信息更新成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('FILE_UPDATE_FAILED', getErrorMessage(error));
  }
});
