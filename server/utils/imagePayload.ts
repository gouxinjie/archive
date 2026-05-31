/**
 * 图片上传请求解析工具
 */

import { assertValidUserId } from './security';

export type ImageFileType = 'gif' | 'jpg' | 'png' | 'webp';

interface MultipartEntry {
  /** 类型：Buffer；含义：表单字段二进制内容；是否必填：是；默认值：空 Buffer */
  data: Buffer;
  /** 类型：字符串；含义：表单字段名称；是否必填：否；默认值：undefined */
  name?: string;
  /** 类型：字符串；含义：上传图片原始文件名；是否必填：否；默认值：undefined */
  filename?: string;
  /** 类型：字符串；含义：上传图片 MIME 类型；是否必填：否；默认值：undefined */
  type?: string;
}

export interface ImageUploadPayload {
  /** 类型：字符串；含义：图片标题；是否必填：是；默认值：由文件名生成 */
  title: string;
  /** 类型：字符串；含义：图片分类；是否必填：是；默认值：其他 */
  category: string;
  /** 类型：字符串；含义：图片原始文件名；是否必填：是；默认值：上传文件名 */
  originalName: string;
  /** 类型：ImageFileType；含义：图片文件类型；是否必填：是；默认值：根据文件名或 MIME 推断 */
  fileType: ImageFileType;
  /** 类型：字符串；含义：图片 MIME 类型；是否必填：是；默认值：根据文件类型生成 */
  mimeType: string;
  /** 类型：Buffer；含义：图片二进制内容；是否必填：是；默认值：空 Buffer */
  content: Buffer;
  /** 类型：数字；含义：图片字节大小；是否必填：是；默认值：0 */
  size: number;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

export interface ImageUpdatePayload {
  /** 类型：字符串；含义：图片标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串；含义：图片分类；是否必填：是；默认值：其他 */
  category: string;
  /** 类型：ImageUploadPayload 或 null；含义：替换上传的图片文件；是否必填：否；默认值：null */
  replacementFile: ImageUploadPayload | null;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

const maxImageFileBytes = 15 * 1024 * 1024;

/**
 * 读取 multipart 文本字段
 * @param entries - multipart 字段数组
 * @param fieldName - 字段名称
 * @returns 字段文本，不存在时返回空字符串
 * @throws 不主动抛出异常
 */
const readTextField = (entries: MultipartEntry[], fieldName: string): string => {
  const entry = entries.find((item) => item.name === fieldName && !item.filename);
  return entry ? entry.data.toString('utf8').trim() : '';
};

/**
 * 标准化可选文本
 * @param value - 原始文本
 * @returns 去空格后的文本或 null
 * @throws 不主动抛出异常
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
 * 根据文件名生成图片标题
 * @param fileName - 原始文件名
 * @returns 去除扩展名后的图片标题
 * @throws 不主动抛出异常
 */
const normalizeTitleFromFileName = (fileName: string): string => {
  const title = fileName.replace(/\.(gif|jpe?g|png|webp)$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名图片';
};

/**
 * 根据文件名和 MIME 类型推断图片文件类型
 * @param fileName - 原始文件名
 * @param mimeType - 浏览器上报的 MIME 类型
 * @returns 支持的图片类型，不支持时返回 null
 * @throws 不主动抛出异常
 */
const getImageFileType = (fileName: string, mimeType: string): ImageFileType | null => {
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedFileName.endsWith('.jpg') || normalizedFileName.endsWith('.jpeg') || mimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (normalizedFileName.endsWith('.png') || mimeType === 'image/png') {
    return 'png';
  }

  if (normalizedFileName.endsWith('.webp') || mimeType === 'image/webp') {
    return 'webp';
  }

  if (normalizedFileName.endsWith('.gif') || mimeType === 'image/gif') {
    return 'gif';
  }

  return null;
};

/**
 * 根据文件头魔数识别真实图片类型
 * @param content - 图片二进制内容
 * @returns 识别到的图片类型，不支持时返回 null
 * @throws 不主动抛出异常
 */
const getImageFileTypeFromContent = (content: Buffer): ImageFileType | null => {
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return 'jpg';
  }

  if (
    content.length >= 8 &&
    content[0] === 0x89 &&
    content[1] === 0x50 &&
    content[2] === 0x4e &&
    content[3] === 0x47 &&
    content[4] === 0x0d &&
    content[5] === 0x0a &&
    content[6] === 0x1a &&
    content[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    content.length >= 6 &&
    content.subarray(0, 6).toString('ascii') === 'GIF87a'
  ) {
    return 'gif';
  }

  if (
    content.length >= 6 &&
    content.subarray(0, 6).toString('ascii') === 'GIF89a'
  ) {
    return 'gif';
  }

  if (
    content.length >= 12 &&
    content.subarray(0, 4).toString('ascii') === 'RIFF' &&
    content.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
};

/**
 * 获取标准图片 MIME 类型
 * @param fileType - 图片文件类型
 * @returns 标准 MIME 类型
 * @throws 不主动抛出异常
 */
export const getImageMimeType = (fileType: ImageFileType): string => {
  const mimeTypes: Record<ImageFileType, string> = {
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  };

  return mimeTypes[fileType];
};

/**
 * 解析并校验图片文件字段
 * @param fileEntry - multipart 文件字段
 * @returns 标准化后的图片文件信息
 * @throws 当文件为空、过大或类型不支持时抛出错误
 */
const parseImageFileEntry = (fileEntry: MultipartEntry): Pick<ImageUploadPayload, 'content' | 'fileType' | 'mimeType' | 'originalName' | 'size'> => {
  if (!fileEntry.filename) {
    throw new Error('请选择需要上传的图片');
  }

  if (fileEntry.data.byteLength <= 0) {
    throw new Error('图片文件不能为空');
  }

  if (fileEntry.data.byteLength > maxImageFileBytes) {
    throw new Error('图片文件不能超过 15MB');
  }

  const declaredFileType = getImageFileType(fileEntry.filename, fileEntry.type || '');
  const fileType = getImageFileTypeFromContent(fileEntry.data);

  if (!declaredFileType || !fileType) {
    throw new Error('图片仅支持 jpg、jpeg、png、webp 或 gif');
  }

  if (declaredFileType !== fileType) {
    throw new Error('图片扩展名或 MIME 类型与文件内容不一致');
  }

  const sanitizedName = sanitizeFileName(fileEntry.filename);
  const originalName = /\.(gif|jpe?g|png|webp)$/i.test(sanitizedName) ? sanitizedName : `${sanitizedName || 'image'}.${fileType}`;

  return {
    content: fileEntry.data,
    fileType,
    mimeType: getImageMimeType(fileType),
    originalName,
    size: fileEntry.data.byteLength
  };
};

/**
 * 解析图片上传表单
 * @param entries - multipart 表单字段
 * @returns 标准化后的图片上传数据
 * @throws 当字段不合法时抛出错误
 */
export const parseImageUploadForm = (entries: MultipartEntry[] | undefined): ImageUploadPayload => {
  if (!entries) {
    throw new Error('上传表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));

  if (!fileEntry) {
    throw new Error('请选择需要上传的图片');
  }

  const imageFile = parseImageFileEntry(fileEntry);
  const title = readTextField(entries, 'title') || normalizeTitleFromFileName(fileEntry.filename || '');

  return {
    title,
    category: normalizeOptionalText(readTextField(entries, 'category')) || '其他',
    ...imageFile,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};

/**
 * 解析图片元信息和可选替换文件表单
 * @param entries - multipart 表单字段
 * @returns 标准化后的图片元信息和替换文件
 * @throws 当字段不合法时抛出错误
 */
export const parseImageUpdateForm = (entries: MultipartEntry[] | undefined): ImageUpdatePayload => {
  if (!entries) {
    throw new Error('更新表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));
  const replacementFile = fileEntry
    ? {
        ...parseImageFileEntry(fileEntry),
        title: normalizeRequiredText(readTextField(entries, 'title'), '图片标题'),
        category: normalizeOptionalText(readTextField(entries, 'category')) || '其他',
        remark: normalizeOptionalText(readTextField(entries, 'remark'))
      }
    : null;

  return {
    title: normalizeRequiredText(readTextField(entries, 'title'), '图片标题'),
    category: normalizeOptionalText(readTextField(entries, 'category')) || '其他',
    replacementFile,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};
