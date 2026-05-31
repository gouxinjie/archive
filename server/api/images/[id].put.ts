/**
 * 更新图片元信息和替换文件接口
 */

import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { getFileAssetById, updateFileAsset } from '../../utils/database';
import {
  buildModuleFileStoragePath,
  deleteBinaryTempFile,
  deleteStoredFile,
  replaceStoredFileWithTemp,
  writeBinaryTempFile
} from '../../utils/fileStorage';
import { parseImageUpdateForm } from '../../utils/imagePayload';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('IMAGE_ID_REQUIRED', '图片标识不能为空');
    }

    const formData = await readMultipartFormData(event);
    const session = assertAuthenticated(event);
    const existingImage = getFileAssetById(session.profileId, 'images', id);

    if (!existingImage) {
      return createErrorResponse('IMAGE_NOT_FOUND', '图片文件不存在');
    }

    const payload = parseImageUpdateForm(formData);
    const replacementFile = payload.replacementFile;
    const storagePath = replacementFile
      ? buildModuleFileStoragePath(session.profileId, 'images', id, replacementFile.fileType)
      : existingImage.storage_path;
    const temporaryFile = replacementFile ? writeBinaryTempFile(storagePath, replacementFile.content) : null;
    let updated = false;

    try {
      updated = updateFileAsset({
        id,
        profileId: session.profileId,
        module: 'images',
        category: payload.category,
        title: payload.title,
        originalName: replacementFile?.originalName || existingImage.original_name,
        storagePath,
        mimeType: replacementFile?.mimeType || existingImage.mime_type,
        size: replacementFile?.size || existingImage.size,
        remark: payload.remark
      });

      if (!updated) {
        if (temporaryFile) {
          deleteBinaryTempFile(temporaryFile.temporaryPath);
        }

        return createErrorResponse('IMAGE_NOT_FOUND', '图片文件不存在');
      }

      if (temporaryFile) {
        replaceStoredFileWithTemp(temporaryFile.temporaryPath, storagePath);
      }
    } catch (error: unknown) {
      if (updated) {
        updateFileAsset({
          id,
          profileId: session.profileId,
          module: 'images',
          category: existingImage.category,
          title: existingImage.title,
          originalName: existingImage.original_name,
          storagePath: existingImage.storage_path,
          mimeType: existingImage.mime_type,
          size: existingImage.size,
          remark: existingImage.remark
        });
      }

      if (temporaryFile) {
        deleteBinaryTempFile(temporaryFile.temporaryPath);
      }

      throw error;
    }

    if (replacementFile && existingImage.storage_path !== storagePath) {
      deleteStoredFile(existingImage.storage_path);
    }

    return createSuccessResponse({ id }, '图片信息更新成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('IMAGE_UPDATE_FAILED', getErrorMessage(error));
  }
});
