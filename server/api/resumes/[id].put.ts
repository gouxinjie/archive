/**
 * 更新简历元信息和替换文件接口
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
import { parseResumeUpdateForm } from '../../utils/resumePayload';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('RESUME_ID_REQUIRED', '简历标识不能为空');
    }

    const formData = await readMultipartFormData(event);
    const session = assertAuthenticated(event);
    const existingResume = getFileAssetById(session.profileId, 'resumes', id);

    if (!existingResume) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    const payload = parseResumeUpdateForm(formData);
    const replacementFile = payload.replacementFile;
    const storagePath = replacementFile
      ? buildModuleFileStoragePath(session.profileId, 'resumes', id, replacementFile.fileType)
      : existingResume.storage_path;
    const temporaryFile = replacementFile ? writeBinaryTempFile(storagePath, replacementFile.content) : null;
    let updated = false;

    try {
      updated = updateFileAsset({
        id,
        profileId: session.profileId,
        module: 'resumes',
        category: payload.category,
        title: payload.title,
        originalName: replacementFile?.originalName || existingResume.original_name,
        storagePath,
        mimeType: replacementFile?.mimeType || existingResume.mime_type,
        size: replacementFile?.size || existingResume.size,
        remark: payload.remark
      });

      if (!updated) {
        if (temporaryFile) {
          deleteBinaryTempFile(temporaryFile.temporaryPath);
        }

        return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
      }

      if (temporaryFile) {
        replaceStoredFileWithTemp(temporaryFile.temporaryPath, storagePath);
      }
    } catch (error: unknown) {
      if (updated) {
        updateFileAsset({
          id,
          profileId: session.profileId,
          module: 'resumes',
          category: existingResume.category,
          title: existingResume.title,
          originalName: existingResume.original_name,
          storagePath: existingResume.storage_path,
          mimeType: existingResume.mime_type,
          size: existingResume.size,
          remark: existingResume.remark
        });
      }

      if (temporaryFile) {
        deleteBinaryTempFile(temporaryFile.temporaryPath);
      }

      throw error;
    }

    if (replacementFile && existingResume.storage_path !== storagePath) {
      deleteStoredFile(existingResume.storage_path);
    }

    return createSuccessResponse({ id }, '简历信息更新成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_UPDATE_FAILED', getErrorMessage(error));
  }
});
