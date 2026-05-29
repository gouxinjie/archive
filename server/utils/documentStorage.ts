/**
 * 文档文件读写工具
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import type { FileAssetRow } from './database';
import type { DocumentFileType } from './documentPayload';

export interface DocumentFileMeta {
  fileType: DocumentFileType;
  mimeType: string;
}

/**
 * 获取上传根目录
 * @returns 上传根目录绝对路径
 * @throws 不抛出异常
 */
const getUploadsRoot = (): string => {
  return resolve(process.env.NUXT_UPLOADS_DIR || './uploads');
};

/**
 * 校验并解析上传文件路径
 * @param storagePath - 相对上传目录的存储路径
 * @returns 文件绝对路径
 * @throws 当路径越界时抛出错误
 */
const resolveUploadPath = (storagePath: string): string => {
  const uploadsRoot = getUploadsRoot();
  const absolutePath = resolve(uploadsRoot, storagePath);
  const relativePath = relative(uploadsRoot, absolutePath);

  if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
    throw new Error('文件路径不合法');
  }

  return absolutePath;
};

/**
 * 获取文档类型对应的 MIME 类型
 * @param fileType - 文档类型
 * @returns MIME 类型
 * @throws 不抛出异常
 */
export const getDocumentMimeType = (fileType: DocumentFileType): string => {
  return fileType === 'md' ? 'text/markdown' : 'text/plain';
};

/**
 * 从文件资产推断文档类型
 * @param item - 文件资产行
 * @returns 文档类型和 MIME 类型
 * @throws 不抛出异常
 */
export const getDocumentFileMeta = (item: FileAssetRow): DocumentFileMeta => {
  if (item.mime_type === 'text/plain' || item.original_name.toLowerCase().endsWith('.txt')) {
    return {
      fileType: 'txt',
      mimeType: 'text/plain'
    };
  }

  return {
    fileType: 'md',
    mimeType: 'text/markdown'
  };
};

/**
 * 创建文档存储路径
 * @param profileId - 档案标识
 * @param id - 文档标识
 * @param fileType - 文档类型
 * @returns 相对上传目录的存储路径
 * @throws 不抛出异常
 */
export const buildDocumentStoragePath = (profileId: string, id: string, fileType: DocumentFileType): string => {
  return `${profileId}/documents/${id}.${fileType}`;
};

/**
 * 读取文档文件内容
 * @param storagePath - 相对上传目录的存储路径
 * @returns 文档内容，文件缺失时返回空字符串
 * @throws 当读取失败时抛出错误
 */
export const readDocumentContent = (storagePath: string): string => {
  const absolutePath = resolveUploadPath(storagePath);

  if (!existsSync(absolutePath)) {
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
};

/**
 * 写入文档文件内容
 * @param storagePath - 相对上传目录的存储路径
 * @param content - 文档内容
 * @returns 文档字节大小
 * @throws 当写入失败时抛出错误
 */
export const writeDocumentContent = (storagePath: string, content: string): number => {
  const absolutePath = resolveUploadPath(storagePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
  return Buffer.byteLength(content, 'utf8');
};

/**
 * 写入文档临时文件
 * @param storagePath - 目标存储路径
 * @param content - 文档内容
 * @returns 临时文件路径和文档字节大小
 * @throws 当写入失败时抛出错误
 */
export const writeDocumentTempContent = (storagePath: string, content: string): { temporaryPath: string; size: number } => {
  const absolutePath = resolveUploadPath(storagePath);
  const temporaryPath = `${absolutePath}.${Date.now()}.tmp`;
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(temporaryPath, content, 'utf8');

  return {
    temporaryPath,
    size: Buffer.byteLength(content, 'utf8')
  };
};

/**
 * 用临时文件替换正式文档文件
 * @param temporaryPath - 临时文件绝对路径
 * @param storagePath - 目标存储路径
 * @returns 无返回值
 * @throws 当替换失败时抛出错误
 */
export const replaceDocumentWithTemp = (temporaryPath: string, storagePath: string): void => {
  const absolutePath = resolveUploadPath(storagePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  renameSync(temporaryPath, absolutePath);
};

/**
 * 删除临时文档文件
 * @param temporaryPath - 临时文件绝对路径
 * @returns 无返回值
 * @throws 当删除失败时抛出错误
 */
export const deleteDocumentTempContent = (temporaryPath: string): void => {
  if (existsSync(temporaryPath)) {
    unlinkSync(temporaryPath);
  }
};

/**
 * 删除文档文件
 * @param storagePath - 相对上传目录的存储路径
 * @returns 无返回值
 * @throws 当删除失败时抛出错误
 */
export const deleteDocumentContent = (storagePath: string): void => {
  const absolutePath = resolveUploadPath(storagePath);

  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath);
  }
};
