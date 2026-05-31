/**
 * 文档请求参数解析工具
 */

import { normalizeDocumentCategory, type DocumentCategory } from '../../src/constants/archiveCategories';

export type DocumentFileType = 'md' | 'txt';

export interface DocumentRequestBody {
  title?: unknown;
  category?: unknown;
  fileType?: unknown;
  originalName?: unknown;
  content?: unknown;
  remark?: unknown;
}

export interface DocumentPayload {
  title: string;
  category: DocumentCategory;
  fileType: DocumentFileType;
  originalName: string;
  content: string;
  remark: string | null;
}

const MAX_DOCUMENT_CONTENT_BYTES = 1024 * 1024;

/**
 * 标准化可选文本
 * @param value - 原始输入值
 * @returns 去除首尾空格后的文本，空值返回 null
 * @throws 不抛出异常
 */
const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * 标准化必填文本
 * @param value - 原始输入值
 * @param fieldName - 字段中文名
 * @returns 去除首尾空格后的文本
 * @throws 当字段为空时抛出错误
 */
const normalizeRequiredText = (value: unknown, fieldName: string): string => {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    throw new Error(`${fieldName}不能为空`);
  }

  return normalized;
};

/**
 * 标准化文档类型
 * @param value - 原始文档类型
 * @returns 文档类型
 * @throws 当文档类型不支持时抛出错误
 */
const normalizeFileType = (value: unknown): DocumentFileType => {
  if (value === 'md' || value === 'txt') {
    return value;
  }

  throw new Error('文档类型仅支持 md 或 txt');
};

/**
 * 清理文件名中的危险字符
 * @param value - 原始文件名
 * @returns 可用于保存的文件名
 * @throws 不抛出异常
 */
const sanitizeFileName = (value: string): string => {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
};

/**
 * 生成规范化原始文件名
 * @param originalName - 用户输入的文件名
 * @param title - 文档标题
 * @param fileType - 文档类型
 * @returns 带正确扩展名的文件名
 * @throws 不抛出异常
 */
const normalizeOriginalName = (originalName: unknown, title: string, fileType: DocumentFileType): string => {
  const fallbackName = sanitizeFileName(title) || 'document';
  const rawName = normalizeOptionalText(originalName) || fallbackName;
  const sanitizedName = sanitizeFileName(rawName).replace(/\.(md|txt)$/i, '');
  return `${sanitizedName || fallbackName}.${fileType}`;
};

/**
 * 解析文档保存请求
 * @param body - 请求体
 * @returns 标准化后的文档参数
 * @throws 当标题、类型或内容大小不合法时抛出错误
 */
export const parseDocumentPayload = (body: DocumentRequestBody): DocumentPayload => {
  const title = normalizeRequiredText(body.title, '文档标题');
  const fileType = normalizeFileType(body.fileType);
  const content = typeof body.content === 'string' ? body.content : '';
  const contentSize = Buffer.byteLength(content, 'utf8');

  if (contentSize > MAX_DOCUMENT_CONTENT_BYTES) {
    throw new Error('文档内容不能超过 1MB');
  }

  return {
    title,
    category: normalizeDocumentCategory(normalizeOptionalText(body.category)),
    fileType,
    originalName: normalizeOriginalName(body.originalName, title, fileType),
    content,
    remark: normalizeOptionalText(body.remark)
  };
};
