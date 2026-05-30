/**
 * 简历文件在线预览链接接口
 */

import { basename } from 'node:path';
import { defineEventHandler, getHeader, getRequestURL, getRouterParam, type H3Event } from 'h3';
import { createErrorResponse, createSuccessResponse, getErrorMessage } from '../../../utils/apiResponse';
import { getFileAssetById, type FileAssetRow } from '../../../utils/database';
import { storedFileExists } from '../../../utils/fileStorage';
import {
  assertAuthenticated,
  assertQueryUserId,
  createFilePreviewToken,
  FILE_PREVIEW_TTL_SECONDS,
  getOwnerUserId
} from '../../../utils/security';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

interface ResumePreviewData {
  /** 类型：字符串；含义：最终打开的预览地址；是否必填：是；默认值：无 */
  url: string;
  /** 类型：字符串联合类型；含义：预览方式；是否必填：是；默认值：office */
  mode: 'office' | 'direct';
  /** 类型：数字；含义：公开文件地址有效期（秒）；是否必填：是；默认值：600 */
  expiresInSeconds: number;
}

/**
 * 获取代理请求头中的第一个有效值
 * @param value - 请求头原始值
 * @returns 第一个有效请求头值
 * @throws 不主动抛出异常
 */
const getFirstHeaderValue = (value: string | undefined): string | null => {
  const [firstValue] = value ? value.split(',') : [];
  const normalizedValue = firstValue?.trim();
  return normalizedValue || null;
};

/**
 * 判断预览源地址是否为本机地址
 * @param origin - 预览源地址
 * @returns 是否为本机地址
 * @throws 当 URL 格式不合法时抛出异常
 */
const isLocalPreviewOrigin = (origin: string): boolean => {
  const parsedOrigin = new URL(origin);
  return LOCAL_PREVIEW_HOSTS.has(parsedOrigin.hostname.toLowerCase());
};

/**
 * 校验 Office 在线预览可访问的公网源地址
 * @param origin - 预览源地址
 * @returns 校验通过后的预览源地址
 * @throws 生产环境使用本机地址时抛出异常
 */
const assertUsablePublicOrigin = (origin: string): string => {
  if (process.env.NODE_ENV === 'production' && isLocalPreviewOrigin(origin)) {
    throw new Error('生产环境 NUXT_PUBLIC_ORIGIN 不能使用 localhost，请配置 ECS 公网域名或公网 IP');
  }

  return origin;
};

/**
 * 获取对外访问源地址
 * @param event - H3 请求事件
 * @returns 对外访问源地址
 * @throws 不主动抛出异常
 */
const getPublicOrigin = (event: H3Event): string => {
  const configuredOrigin = process.env.NUXT_PUBLIC_ORIGIN?.trim();

  if (configuredOrigin) {
    return assertUsablePublicOrigin(configuredOrigin.replace(/\/+$/, ''));
  }

  const forwardedHost = getFirstHeaderValue(getHeader(event, 'x-forwarded-host'));

  if (forwardedHost) {
    const forwardedProtocol = getFirstHeaderValue(getHeader(event, 'x-forwarded-proto')) || getRequestURL(event).protocol.replace(':', '');
    return assertUsablePublicOrigin(`${forwardedProtocol}://${forwardedHost}`.replace(/\/+$/, ''));
  }

  return assertUsablePublicOrigin(getRequestURL(event).origin.replace(/\/+$/, ''));
};

/**
 * 创建带文件名后缀的公开简历文件地址
 * @param event - H3 请求事件
 * @param resume - 简历文件资源
 * @param token - 短时预览令牌
 * @returns 公开简历文件地址
 * @throws 当 URL 构造失败时抛出异常
 */
const createPublicResumeFileUrl = (event: H3Event, resume: FileAssetRow, token: string): string => {
  const origin = getPublicOrigin(event);
  const fileName = encodeURIComponent(basename(resume.original_name) || `${resume.id}.docx`);
  const url = new URL(`/api/public/resumes/${encodeURIComponent(resume.id)}/${fileName}`, `${origin}/`);
  url.searchParams.set('userId', getOwnerUserId());
  url.searchParams.set('token', token);
  return url.toString();
};

/**
 * 创建 Office 在线预览地址
 * @param fileUrl - 可公开访问的文件地址
 * @returns Office 在线预览地址
 * @throws 当 URL 构造失败时抛出异常
 */
const createOfficePreviewUrl = (fileUrl: string): string => {
  const url = new URL('https://view.officeapps.live.com/op/view.aspx');
  url.searchParams.set('src', fileUrl);
  return url.toString();
};

/**
 * 判断简历文件是否应该使用 Office 在线预览
 * @param resume - 简历文件资源
 * @returns 是否使用 Office 在线预览
 * @throws 不主动抛出异常
 */
const shouldUseOfficePreview = (resume: FileAssetRow): boolean => {
  return resume.mime_type === DOCX_MIME_TYPE || resume.original_name.toLowerCase().endsWith('.docx');
};

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);

    const id = getRouterParam(event, 'id');

    if (!id) {
      return createErrorResponse('RESUME_ID_REQUIRED', '简历标识不能为空');
    }

    const session = assertAuthenticated(event);
    const resume = getFileAssetById(session.profileId, 'resumes', id);

    if (!resume) {
      return createErrorResponse('RESUME_NOT_FOUND', '简历文件不存在');
    }

    if (!storedFileExists(resume.storage_path)) {
      return createErrorResponse('RESUME_FILE_MISSING', '简历文件不存在');
    }

    const previewToken = createFilePreviewToken({
      profileId: session.profileId,
      module: 'resumes',
      fileId: resume.id
    });
    const publicFileUrl = createPublicResumeFileUrl(event, resume, previewToken);
    const useOfficePreview = shouldUseOfficePreview(resume);
    const url = useOfficePreview ? createOfficePreviewUrl(publicFileUrl) : publicFileUrl;

    return createSuccessResponse<ResumePreviewData>(
      {
        url,
        mode: useOfficePreview ? 'office' : 'direct',
        expiresInSeconds: FILE_PREVIEW_TTL_SECONDS
      },
      '预览链接创建成功'
    );
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('RESUME_PREVIEW_FAILED', getErrorMessage(error));
  }
});
