/**
 * 简历上传请求解析工具
 */

import { assertValidUserId } from './security';

export type ResumeFileType = 'docx' | 'pdf';

interface MultipartEntry {
  /** 类型：Buffer；含义：表单字段二进制内容；是否必填：是；默认值：空 Buffer */
  data: Buffer;
  /** 类型：字符串；含义：表单字段名称；是否必填：否；默认值：undefined */
  name?: string;
  /** 类型：字符串；含义：上传文件原始文件名；是否必填：否；默认值：undefined */
  filename?: string;
  /** 类型：字符串；含义：上传文件 MIME 类型；是否必填：否；默认值：undefined */
  type?: string;
}

export interface ResumeUploadPayload {
  /** 类型：字符串；含义：简历标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串或 null；含义：简历分类；是否必填：否；默认值：null */
  category: string | null;
  /** 类型：字符串；含义：原始文件名；是否必填：是；默认值：无 */
  originalName: string;
  /** 类型：ResumeFileType；含义：简历文件类型；是否必填：是；默认值：无 */
  fileType: ResumeFileType;
  /** 类型：字符串；含义：文件 MIME 类型；是否必填：是；默认值：无 */
  mimeType: string;
  /** 类型：Buffer；含义：文件二进制内容；是否必填：是；默认值：空 Buffer */
  content: Buffer;
  /** 类型：数字；含义：文件字节大小；是否必填：是；默认值：0 */
  size: number;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

export interface ResumeUpdateRequestBody {
  /** 类型：未知；含义：请求用户标识；是否必填：是；默认值：无 */
  userId?: unknown;
  /** 类型：未知；含义：简历标题；是否必填：是；默认值：无 */
  title?: unknown;
  /** 类型：未知；含义：简历分类；是否必填：否；默认值：通用 */
  category?: unknown;
  /** 类型：未知；含义：备注；是否必填：否；默认值：null */
  remark?: unknown;
}

export interface ResumeUpdatePayload {
  /** 类型：字符串；含义：简历标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串；含义：简历分类；是否必填：是；默认值：通用 */
  category: string;
  /** 类型：ResumeUploadPayload 或 null；含义：替换上传的简历文件；是否必填：否；默认值：null */
  replacementFile: ResumeUploadPayload | null;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
}

const maxResumeFileBytes = 20 * 1024 * 1024;

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
 * 标准化请求体中的可选文本
 * @param value - 原始输入值
 * @returns 去空格后的文本或 null
 * @throws 不抛出异常
 */
const normalizeOptionalBodyText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

/**
 * 标准化请求体中的必填文本
 * @param value - 原始输入值
 * @param fieldName - 字段中文名称
 * @returns 去空格后的文本
 * @throws 当文本为空时抛出错误
 */
const normalizeRequiredBodyText = (value: unknown, fieldName: string): string => {
  const normalizedValue = normalizeOptionalBodyText(value);

  if (!normalizedValue) {
    throw new Error(`${fieldName}不能为空`);
  }

  return normalizedValue;
};

/**
 * 清理文件名中的危险字符
 * @param value - 原始文件名
 * @returns 安全文件名
 * @throws 不抛出异常
 */
const sanitizeFileName = (value: string): string => {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-');
};

/**
 * 根据原始文件名生成简历标题
 * @param fileName - 原始文件名
 * @returns 简历标题
 * @throws 不抛出异常
 */
const normalizeTitleFromFileName = (fileName: string): string => {
  const title = fileName.replace(/\.(docx|pdf)$/i, '').replace(/[-_]+/g, ' ').trim();
  return title || '未命名简历';
};

/**
 * 根据文件名和 MIME 类型推断简历文件类型
 * @param fileName - 原始文件名
 * @param mimeType - 浏览器上报的 MIME 类型
 * @returns 简历文件类型，不支持时返回 null
 * @throws 不抛出异常
 */
const getResumeFileType = (fileName: string, mimeType: string): ResumeFileType | null => {
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedFileName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }

  if (
    normalizedFileName.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  return null;
};

/**
 * 解析并校验简历文件字段
 * @param fileEntry - multipart 文件字段
 * @returns 标准化后的简历文件信息
 * @throws 当文件为空、过大或类型不支持时抛出错误
 */
const parseResumeFileEntry = (fileEntry: MultipartEntry): Pick<ResumeUploadPayload, 'content' | 'fileType' | 'mimeType' | 'originalName' | 'size'> => {
  if (!fileEntry.filename) {
    throw new Error('请选择需要上传的简历文件');
  }

  if (fileEntry.data.byteLength <= 0) {
    throw new Error('简历文件不能为空');
  }

  if (fileEntry.data.byteLength > maxResumeFileBytes) {
    throw new Error('简历文件不能超过 20MB');
  }

  const fileType = getResumeFileType(fileEntry.filename, fileEntry.type || '');

  if (!fileType) {
    throw new Error('简历文件仅支持 docx 或 pdf');
  }

  const sanitizedName = sanitizeFileName(fileEntry.filename);
  const originalName = /\.(docx|pdf)$/i.test(sanitizedName) ? sanitizedName : `${sanitizedName || 'resume'}.${fileType}`;

  return {
    content: fileEntry.data,
    fileType,
    mimeType: getResumeMimeType(fileType),
    originalName,
    size: fileEntry.data.byteLength
  };
};

/**
 * 获取标准 MIME 类型
 * @param fileType - 简历文件类型
 * @returns 标准 MIME 类型
 * @throws 不抛出异常
 */
export const getResumeMimeType = (fileType: ResumeFileType): string => {
  return fileType === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
};

/**
 * 解析简历上传表单
 * @param entries - multipart 表单字段
 * @returns 标准化后的简历上传数据
 * @throws 当字段不合法时抛出错误
 */
export const parseResumeUploadForm = (entries: MultipartEntry[] | undefined): ResumeUploadPayload => {
  if (!entries) {
    throw new Error('上传表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));

  if (!fileEntry || !fileEntry.filename) {
    throw new Error('请选择需要上传的简历文件');
  }

  const resumeFile = parseResumeFileEntry(fileEntry);
  const title = readTextField(entries, 'title') || normalizeTitleFromFileName(fileEntry.filename);

  return {
    title,
    category: normalizeOptionalText(readTextField(entries, 'category')) || '通用',
    ...resumeFile,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};

/**
 * 解析简历元信息更新请求
 * @param body - 请求体
 * @returns 标准化后的简历元信息
 * @throws 当标题或用户标识不合法时抛出错误
 */
export const parseResumeUpdatePayload = (body: ResumeUpdateRequestBody): ResumeUpdatePayload => {
  assertValidUserId(body.userId);

  return {
    title: normalizeRequiredBodyText(body.title, '简历标题'),
    category: normalizeOptionalBodyText(body.category) || '通用',
    replacementFile: null,
    remark: normalizeOptionalBodyText(body.remark)
  };
};

/**
 * 解析简历元信息和可选替换文件表单
 * @param entries - multipart 表单字段
 * @returns 标准化后的简历元信息和替换文件
 * @throws 当字段不合法时抛出错误
 */
export const parseResumeUpdateForm = (entries: MultipartEntry[] | undefined): ResumeUpdatePayload => {
  if (!entries) {
    throw new Error('更新表单不能为空');
  }

  assertValidUserId(readTextField(entries, 'userId'));

  const fileEntry = entries.find((item) => item.name === 'file' && Boolean(item.filename));
  const replacementFile = fileEntry
    ? {
        ...parseResumeFileEntry(fileEntry),
        title: normalizeRequiredBodyText(readTextField(entries, 'title'), '简历标题'),
        category: normalizeOptionalText(readTextField(entries, 'category')) || '通用',
        remark: normalizeOptionalText(readTextField(entries, 'remark'))
      }
    : null;

  return {
    title: normalizeRequiredBodyText(readTextField(entries, 'title'), '简历标题'),
    category: normalizeOptionalText(readTextField(entries, 'category')) || '通用',
    replacementFile,
    remark: normalizeOptionalText(readTextField(entries, 'remark'))
  };
};
