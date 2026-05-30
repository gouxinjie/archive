/**
 * 通用上传文件存储工具
 */

import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import type { ArchiveModuleKey } from '../../src/types/models';

interface BinaryTempFile {
  /** 类型：字符串；含义：临时文件绝对路径；是否必填：是；默认值：无 */
  temporaryPath: string;
  /** 类型：数字；含义：文件字节大小；是否必填：是；默认值：0 */
  size: number;
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
export const resolveUploadPath = (storagePath: string): string => {
  const uploadsRoot = getUploadsRoot();
  const absolutePath = resolve(uploadsRoot, storagePath);
  const relativePath = relative(uploadsRoot, absolutePath);

  if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
    throw new Error('文件路径不合法');
  }

  return absolutePath;
};

/**
 * 生成模块文件存储路径
 * @param profileId - 当前账号标识
 * @param module - 文件所属模块
 * @param id - 文件资产标识
 * @param extension - 文件扩展名
 * @returns 相对上传目录的存储路径
 * @throws 不抛出异常
 */
export const buildModuleFileStoragePath = (profileId: string, module: ArchiveModuleKey, id: string, extension: string): string => {
  return `${profileId}/${module}/${id}.${extension}`;
};

/**
 * 写入二进制临时文件
 * @param storagePath - 目标相对存储路径
 * @param content - 二进制文件内容
 * @returns 临时文件路径和文件大小
 * @throws 当写入失败时抛出错误
 */
export const writeBinaryTempFile = (storagePath: string, content: Buffer): BinaryTempFile => {
  const absolutePath = resolveUploadPath(storagePath);
  const temporaryPath = `${absolutePath}.${Date.now()}.tmp`;
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(temporaryPath, content);

  return {
    temporaryPath,
    size: content.byteLength
  };
};

/**
 * 用临时文件替换正式文件
 * @param temporaryPath - 临时文件绝对路径
 * @param storagePath - 目标相对存储路径
 * @returns 无返回值
 * @throws 当替换失败时抛出错误
 */
export const replaceStoredFileWithTemp = (temporaryPath: string, storagePath: string): void => {
  const absolutePath = resolveUploadPath(storagePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  renameSync(temporaryPath, absolutePath);
};

/**
 * 删除临时文件
 * @param temporaryPath - 临时文件绝对路径
 * @returns 无返回值
 * @throws 当删除失败时抛出错误
 */
export const deleteBinaryTempFile = (temporaryPath: string): void => {
  if (existsSync(temporaryPath)) {
    unlinkSync(temporaryPath);
  }
};

/**
 * 判断存储文件是否存在
 * @param storagePath - 相对上传目录的存储路径
 * @returns 文件是否存在
 * @throws 当路径非法时抛出错误
 */
export const storedFileExists = (storagePath: string): boolean => {
  return existsSync(resolveUploadPath(storagePath));
};

/**
 * 删除存储文件
 * @param storagePath - 相对上传目录的存储路径
 * @returns 无返回值
 * @throws 当删除失败时抛出错误
 */
export const deleteStoredFile = (storagePath: string): void => {
  const absolutePath = resolveUploadPath(storagePath);

  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath);
  }
};
