/**
 * 应用常量定义
 */

import type { ArchiveModuleConfig } from '~/types/models';

export const APP_NAME = '个人档案';

export const APP_ENGLISH_NAME = 'Archive';

export const DEFAULT_USER_ID = 'owner';

export const ARCHIVE_MODULES: readonly ArchiveModuleConfig[] = [
  {
    key: 'passwords',
    name: '我的密码',
    description: '平台账号、登录方式、密码和备注',
    tone: 'blue'
  },
  {
    key: 'documents',
    name: '我的文档',
    description: '工作记录、项目说明、备忘和模板',
    tone: 'cyan'
  },
  {
    key: 'resumes',
    name: '我的简历',
    description: '不同岗位、语言和用途的简历文件',
    tone: 'indigo'
  },
  {
    key: 'images',
    name: '我的图片',
    description: '证件照、自拍照、生活照和工作照',
    tone: 'teal'
  },
  {
    key: 'certificates',
    name: '我的证件',
    description: '身份证、学历证明、入职材料等',
    tone: 'sky'
  },
  {
    key: 'study',
    name: '学习资料',
    description: '前端、后端、数据库和 AI 相关学习资料',
    tone: 'violet'
  }
] as const;
