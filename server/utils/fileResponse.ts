/**
 * 文件读取响应工具
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { H3Event } from 'h3';
import { setHeader } from 'h3';
import type { FileAssetRow } from './database';
import { resolveUploadPath } from './fileStorage';

/**
 * 判断查询参数是否要求下载
 * @param value - 查询参数值
 * @returns 是否下载附件
 * @throws 不主动抛出异常
 */
export const isDownloadRequested = (value: unknown): boolean => {
  return value === '1' || value === 'true' || value === true;
};

/**
 * 生成响应头文件名
 * @param fileName - 原始文件名
 * @param download - 是否作为附件下载
 * @param fallbackName - 兜底文件名
 * @returns Content-Disposition 文件名片段
 * @throws 不主动抛出异常
 */
export const createContentDisposition = (fileName: string, download: boolean, fallbackName: string): string => {
  const safeFallbackName = basename(fileName).replace(/[^\w.-]/g, '-');
  const dispositionType = download ? 'attachment' : 'inline';
  return `${dispositionType}; filename="${safeFallbackName || fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

/**
 * 写入文件响应头并读取文件内容
 * @param event - H3 请求事件
 * @param file - 文件资产记录
 * @param download - 是否作为附件下载
 * @param fallbackName - 兜底文件名
 * @param cacheControl - 缓存控制响应头
 * @returns 文件二进制内容
 * @throws 当文件读取失败时抛出错误
 */
export const createStoredFileResponse = (
  event: H3Event,
  file: FileAssetRow,
  download: boolean,
  fallbackName: string,
  cacheControl = 'private, max-age=60'
): Buffer => {
  setHeader(event, 'Content-Type', file.mime_type || 'application/octet-stream');
  setHeader(event, 'Content-Length', file.size);
  setHeader(event, 'Content-Disposition', createContentDisposition(file.original_name, download, fallbackName));
  setHeader(event, 'Cache-Control', cacheControl);

  const absolutePath = resolveUploadPath(file.storage_path);
  return readFileSync(absolutePath, { encoding: null });
};
