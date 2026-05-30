/**
 * 新增简历文件接口
 */

import { randomUUID } from 'node:crypto';
import { defineEventHandler, readMultipartFormData } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { createFileAsset, deleteFileAsset } from '../../utils/database';
import {
  buildModuleFileStoragePath,
  deleteBinaryTempFile,
  replaceStoredFileWithTemp,
  writeBinaryTempFile
} from '../../utils/fileStorage';
import { parseResumeUploadForm } from '../../utils/resumePayload';
import { assertAuthenticated, assertCsrfToken } from '../../utils/security';

export default defineEventHandler(async (event) => {
  try {
    assertCsrfToken(event);

    const session = assertAuthenticated(event);
    const formData = await readMultipartFormData(event);
    const payload = parseResumeUploadForm(formData);
    const id = randomUUID();
    const storagePath = buildModuleFileStoragePath(session.profileId, 'resumes', id, payload.fileType);
    const temporaryFile = writeBinaryTempFile(storagePath, payload.content);
    let assetCreated = false;

    try {
      createFileAsset({
        id,
        profileId: session.profileId,
        module: 'resumes',
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
        deleteFileAsset(id, session.profileId, 'resumes');
      }

      deleteBinaryTempFile(temporaryFile.temporaryPath);
      throw error;
    }

    return createSuccessResponse({ id }, '简历上传成功');
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_CREATE_FAILED', getErrorMessage(error));
  }
});
