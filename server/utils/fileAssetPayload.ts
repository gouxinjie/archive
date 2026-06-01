/**
 * 通用文件资产上传请求解析工具
 */

import type { ArchiveModuleKey } from '../../src/types/models';
import { normalizeCertificateCategory, normalizeStudyCategory } from '../../src/constants/archiveCategories';
import { assertValidUserId } from './security';

export type EditableFileModuleKey = 'certificates' | 'study';

export interface MultipartEntry {
  /** 类型：Buffer；含义：表单字段二进制内容；是否必填：是；默认值：空 Buffer */
  data: Buffer;
  /** 类型：字符串；含义：表单字段名称；是否必填：否；默认值：undefined */
  name?: string;
  /** 类型：字符串；含义：上传文件原始文件名；是否必填：否；默认值：undefined */
  filename?: string;
  /** 类型：字符串；含义：上传文件 MIME 类型；是否必填：否；默认值：undefined */
  type?: string;
}

export interface GenericFileUploadPayload {
  /** 类型：字符串；含义：文件标题；是否必填：是；默认值：由文件名生成 */
  title: string;
  /** 类型：字符串；含义：文件分类；是否必填：是；默认值：按模块生成 */
  category: string;
  /** 类型：字符串；含义：上传文件原始名称；是否必填：是；默认值：上传文件名 */
  originalName: string;
  /** 类型：字符串；含义：文件扩展名；是否必填：是；默认值：根据文件名推断 */
  fileType: string;
  /** 类型：字符串；含义：文件 MIME 类型；是否必填：是；默认值：根据文件类型生成 */
  mimeType: string;
  /** 类型：Buffer；含义：文件二进制内容；是否必填：是；默认值：空 Buffer */
  content: Buffer;
  /** 类型：数字；含义：文件字节大小；是否必填：是；默认值：0 */
  size: number;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

export interface GenericFileUpdatePayload {
  /** 类型：字符串；含义：文件标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串；含义：文件分类；是否必填：是；默认值：按模块生成 */
  category: string;
  /** 类型：GenericFileUploadPayload 或 null；含义：替换上传的文件；是否必填：否；默认值：null */
  replacementFile: GenericFileUploadPayload | null;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

const editableFileModules: readonly EditableFileModuleKey[] = ['certificates', 'study'];
const maxGenericFileBytes = 25 * 1024 * 1024;

const mimeTypes: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  webp: 'image/webp'
};

/**
 * 判断模块是否支持通用文件增删改
 * @param moduleKey - 模块标识
 * @returns 是否支持
 * @throws 不抛出异常
 */
export const isEditableFileModuleKey = (moduleKey: string | undefined): moduleKey is EditableFileModuleKey => {
  return editableFileModules.some((item) => item === moduleKey);
};

/**
 * 读取 multipart 文本字段
 * @param entries - multipart 字段数组
 * @param fieldName - 字段名称
 * @returns 字段文本，不存在时返回空字符串
 * @throws 不抛出异常
 */
const readTextField = (entries: MultipartEntry[], fieldName: string): string => {
  const entry = entries.find((item) => item.name === fieldName && !item.filename);
  return entry ? entry.data.toString('utf8').trim() : '';
};

/**
 * 标准化可选文本
 * @param value - 原始文本
 * @returns 去空格后的文本或 null
 * @throws 不抛出异常
 */
const normalizeOptionalText = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

/**
 * 标准化必填文本
 * @param value - 原始文本
 * @param fieldName - 字段中文名称
 * @returns 去空格后的文本
 * @throws 当文本为空时抛出错误
 */
const normalizeRequiredText = (value: string, fieldName: string): string => {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    throw new Error(`${fieldName}不能为空`);
  }

  return normalizedValue;
};

/**
 * 清理文件名中的危险字符
 * @param value - 原始文件名
 * @returns 安全文件名
 * @throws 不主动抛出异常
 */
const sanitizeFileName = (value: string): string => {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-');
};

/**
 * 从文件名读取扩展名
 * @param fileName - 原始文件名
 * @returns 小写扩展名
 * @throws 当扩展名缺失时抛出错误
 */
const getFileExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.trim().toLowerCase();

  if (!extension) {
    throw new Error('文件扩展名不能为空');
  }

  return extension === 'jpeg' ? 'jpg' : extension;
};

/**
 * 根据文件名生成标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的标题
 * @throws 不抛出异常
 */
const normalizeTitleFromFileName = (fileName: string): string => {
  const title = fileName.replace(/\.[^.]+$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名文件';
};

/**
 * 判断文件头是否匹配图片类型
 * @param content - 文件内容
 * @param extension - 文件扩展名
 * @returns 是否匹配
 * @throws 不抛出异常
 */
const isValidImageContent = (content: Buffer, extension: string): boolean => {
  if (extension === 'jpg') {
    return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  }

  if (extension === 'png') {
    return (
      content.length >= 8 &&
      content[0] === 0x89 &&
      content[1] === 0x50 &&
      content[2] === 0x4e &&
      content[3] === 0x47 &&
      content[4] === 0x0d &&
      content[5] === 0x0a &&
      content[6] === 0x1a &&
      content[7] === 0x0a
    );
  }

  if (extension === 'gif') {
    return content.length >= 6 && ['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString('ascii'));
  }

  if (extension === 'webp') {
    return content.length >= 12 && content.subarray(0, 4).toString('ascii') === 'RIFF' && content.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  return false;
};

/**
 * 判断文件内容是否匹配文档类型
 * @param content - 文件内容
 * @param extension - 文件扩展名
 * @returns 是否匹配
 * @throws 不抛出异常
 */
const isValidDocumentContent = (content: Buffer, extension: string): boolean => {
  if (extension === 'pdf') {
    return content.length >= 4 && content.subarray(0, 4).toString('ascii') === '%PDF';
  }

  if (extension === 'docx') {
    return content.length >= 4 && content[0] === 0x50 && content[1] === 0x4b && content[2] === 0x03 && content[3] === 0x04;
  }

  if (extension === 'doc') {
    return (
      content.length >= 8 &&
      content[0] === 0xd0 &&
      content[1] === 0xcf &&
      content[2] === 0x11 &&
      content[3] === 0xe0 &&
      content[4] === 0xa1 &&
      content[5] === 0xb1 &&
      content[6] === 0x1a &&
      content[7] === 0xe1
    );
  }

  return extension === 'md' || extension === 'txt';
};

/**
 * 校验扩展名和文件内容
 * @param content - 文件内容
 * @param extension - 文件扩展名
 * @returns 无返回值
 * @throws 当文件类型不支持或内容不匹配时抛出错误
 */
const assertSupportedFileContent = (content: Buffer, extension: string): void => {
  if (!Object.keys(mimeTypes).includes(extension)) {
    throw new Error('仅支持上传 jpg、jpeg、png、webp、gif、pdf、doc、docx、md 或 txt 文件');
  }

  if (['jpg', 'png', 'gif', 'webp'].includes(extension) && !isValidImageContent(content, extension)) {
    throw new Error('图片扩展名与文件内容不一致');
  }

  if (['pdf', 'doc', 'docx', 'md', 'txt'].includes(extension) && !isValidDocumentContent(content, extension)) {
    throw new Error('文档扩展名与文件内容不一致');
  }
};

/**
 * 按模块归一化分类
 * @param moduleKey - 文件模块
 * @param category - 原始分类
 * @returns 归一化后的分类
 * @throws 不抛出异常
 */
const normalizeModuleCategory = (moduleKey: EditableFileModuleKey, category: string | null): string => {
  if (moduleKey === 'study') {
    return normalizeStudyCategory(category);
  }

  return normalizeCertificateCategory(category);
};

/**
 * 解析并校验上传文件字段
 * @param fileEntry - multipart 文件字段
 * @returns 标准化后的文件信息
 * @throws 当文件为空、过大或类型不支持时抛出错误
 */
const parseFileEntry = (fileEntry: MultipartEntry): Pick<GenericFileUploadPayload, 'content' | 'fileType' | 'mimeType' | 'originalName' | 'size'> => {
  if (!fileEntry.filename) {
    throw new Error('请选择需要上传的文件');
  }

  if (fileEntry.data.byteLength <= 0) {
    throw new Error('文件不能为空');
  }

  if (fileEntry.data.byteLength > maxGenericFileBytes) {
    throw new Error('文件不能超过 25MB');
  }

  const sanitizedName = sanitizeFileName(fileEntry.filename);
  const fileType = getFileExtension(sanitizedName);
  assertSupportedFileContent(fileEntry.data, fileType);

  return {
    content: fileEntry.data,
    fileType,
    mimeType: mimeTypes[fileType] || 'application/octet-stream',
    originalName: sanitizedName || `file.${fileType}`,
    size: fileEntry.data.byteLength
  };
};

/**
 * 解析通用文件上传表单
 * @param moduleKey - 文件所属模块
 * @param entries - multipart 表单字段
 * @returns 标准化后的上传数据
 * @throws 当字段不合法时抛出错误
 */
export const parseGenericFileUploadForm = (moduleKey: EditableFileModuleKey, entries: MultipartEntry[] | undefined): GenericFileUploadPayload => {
  if (!entries) {
    throw new Error('上传表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));

  if (!fileEntry) {
    throw new Error('请选择需要上传的文件');
  }

  const file = parseFileEntry(fileEntry);
  const title = readTextField(entries, 'title') || normalizeTitleFromFileName(file.originalName);

  return {
    title,
    category: normalizeModuleCategory(moduleKey, normalizeOptionalText(readTextField(entries, 'category'))),
    ...file,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};

/**
 * 解析通用文件更新表单
 * @param moduleKey - 文件所属模块
 * @param entries - multipart 表单字段
 * @returns 标准化后的更新数据
 * @throws 当字段不合法时抛出错误
 */
export const parseGenericFileUpdateForm = (moduleKey: EditableFileModuleKey, entries: MultipartEntry[] | undefined): GenericFileUpdatePayload => {
  if (!entries) {
    throw new Error('更新表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));
  const replacementFile = fileEntry ? parseGenericFileUploadForm(moduleKey, entries) : null;

  return {
    title: normalizeRequiredText(readTextField(entries, 'title'), '文件标题'),
    category: normalizeModuleCategory(moduleKey, normalizeOptionalText(readTextField(entries, 'category'))),
    replacementFile,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};

/**
 * 将可编辑文件模块转换为档案模块
 * @param moduleKey - 可编辑文件模块
 * @returns 档案模块标识
 * @throws 不抛出异常
 */
export const toArchiveModuleKey = (moduleKey: EditableFileModuleKey): ArchiveModuleKey => moduleKey;
