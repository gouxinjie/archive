/**
 * 模块详情列表接口
 */

import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { ARCHIVE_MODULES } from '../../../src/constants/app';
import type { ArchiveModuleKey, DocumentListItem, FileAssetListItem, ModuleDetailData, PasswordListItem } from '../../../src/types/models';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../utils/apiResponse';
import { listFileAssets, listPasswordItems } from '../../utils/database';
import { getDocumentFileMeta } from '../../utils/documentStorage';
import { assertAuthenticated } from '../../utils/security';

const moduleKeys = new Set<string>(ARCHIVE_MODULES.map((item) => item.key));

/**
 * 判断模块标识是否有效
 * @param value - 待校验模块标识
 * @returns 是否有效模块标识
 * @throws 不抛出异常
 */
const isArchiveModuleKey = (value: string | undefined): value is ArchiveModuleKey => {
  return Boolean(value && moduleKeys.has(value));
};

/**
 * 读取搜索关键词
 * @param value - 查询参数值
 * @returns 标准化后的搜索关键词
 * @throws 不抛出异常
 */
const normalizeKeyword = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

export default defineEventHandler((event) => {
  try {
    const session = assertAuthenticated(event);
    const profileId = session.profileId;

    const moduleKey = getRouterParam(event, 'module');

    if (!isArchiveModuleKey(moduleKey)) {
      return createErrorResponse('MODULE_NOT_FOUND', '模块不存在');
    }

    const query = getQuery(event);
    const keyword = normalizeKeyword(query.keyword);
    const moduleConfig = ARCHIVE_MODULES.find((item) => item.key === moduleKey);

    if (!moduleConfig) {
      return createErrorResponse('MODULE_NOT_FOUND', '模块不存在');
    }

    if (moduleKey === 'passwords') {
      const items: PasswordListItem[] = listPasswordItems(profileId, keyword).map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        loginUrl: item.login_url,
        loginMethod: item.login_method,
        account: item.account,
        password: item.password,
        phone: item.phone,
        email: item.email,
        remark: item.remark,
        updatedAt: item.updated_at
      }));

      return createSuccessResponse<ModuleDetailData>({
        module: moduleConfig,
        items
      });
    }

    if (moduleKey === 'documents') {
      const items: DocumentListItem[] = listFileAssets(profileId, moduleKey, keyword).map((item) => {
        const documentMeta = getDocumentFileMeta(item);

        return {
          id: item.id,
          module: item.module as ArchiveModuleKey,
          category: item.category,
          title: item.title,
          originalName: item.original_name,
          storagePath: item.storage_path,
          mimeType: documentMeta.mimeType,
          size: item.size,
          remark: item.remark,
          updatedAt: item.updated_at,
          fileType: documentMeta.fileType
        };
      });

      return createSuccessResponse<ModuleDetailData>({
        module: moduleConfig,
        items
      });
    }

    const items: FileAssetListItem[] = listFileAssets(profileId, moduleKey, keyword).map((item) => ({
      id: item.id,
      module: item.module as ArchiveModuleKey,
      category: item.category,
      title: item.title,
      originalName: item.original_name,
      storagePath: item.storage_path,
      mimeType: item.mime_type,
      size: item.size,
      remark: item.remark,
      updatedAt: item.updated_at
    }));

    return createSuccessResponse<ModuleDetailData>({
      module: moduleConfig,
      items
    });
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('MODULE_QUERY_FAILED', getErrorMessage(error));
  }
});
