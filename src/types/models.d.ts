export type ArchiveModuleKey = 'passwords' | 'documents' | 'resumes' | 'images' | 'certificates' | 'study';

export type ArchiveModuleTone = 'blue' | 'cyan' | 'indigo' | 'teal' | 'sky' | 'violet';

export interface ArchiveModuleConfig {
  /** 类型：ArchiveModuleKey；含义：模块唯一标识；是否必填：是；默认值：无 */
  key: ArchiveModuleKey;
  /** 类型：字符串；含义：模块中文名称；是否必填：是；默认值：无 */
  name: string;
  /** 类型：字符串；含义：模块说明；是否必填：是；默认值：无 */
  description: string;
  /** 类型：ArchiveModuleTone；含义：模块冷色调标识；是否必填：是；默认值：blue */
  tone: ArchiveModuleTone;
}

export interface RecentFileItem {
  /** 类型：字符串；含义：文件唯一标识；是否必填：是；默认值：无 */
  id: string;
  /** 类型：字符串；含义：文件标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：ArchiveModuleKey；含义：所属模块；是否必填：是；默认值：无 */
  module: ArchiveModuleKey;
  /** 类型：字符串；含义：上传时间；是否必填：是；默认值：无 */
  createdAt: string;
}

export interface PasswordListItem {
  /** 类型：字符串；含义：密码记录唯一标识；是否必填：是；默认值：无 */
  id: string;
  /** 类型：字符串；含义：平台名称；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串；含义：分类名称；是否必填：是；默认值：无 */
  category: string;
  /** 类型：字符串或 null；含义：登录网址；是否必填：否；默认值：null */
  loginUrl: string | null;
  /** 类型：字符串或 null；含义：登录方式；是否必填：否；默认值：null */
  loginMethod: string | null;
  /** 类型：字符串或 null；含义：登录账号；是否必填：否；默认值：null */
  account: string | null;
  /** 类型：字符串或 null；含义：登录密码；是否必填：否；默认值：null */
  password: string | null;
  /** 类型：字符串或 null；含义：绑定手机号；是否必填：否；默认值：null */
  phone: string | null;
  /** 类型：字符串或 null；含义：绑定邮箱；是否必填：否；默认值：null */
  email: string | null;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
  /** 类型：字符串；含义：更新时间；是否必填：是；默认值：数据库生成 */
  updatedAt: string;
}

export interface PasswordFormPayload {
  /** 类型：字符串或 undefined；含义：密码记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：平台名称；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：分类名称；是否必填：是；默认值：其他 */
  category: string;
  /** 类型：字符串；含义：登录网址；是否必填：否；默认值：空字符串 */
  loginUrl: string;
  /** 类型：字符串；含义：登录方式；是否必填：否；默认值：空字符串 */
  loginMethod: string;
  /** 类型：字符串；含义：登录账号；是否必填：否；默认值：空字符串 */
  account: string;
  /** 类型：字符串；含义：登录密码；是否必填：否；默认值：空字符串 */
  password: string;
  /** 类型：字符串；含义：绑定手机号；是否必填：否；默认值：空字符串 */
  phone: string;
  /** 类型：字符串；含义：绑定邮箱；是否必填：否；默认值：空字符串 */
  email: string;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

export type DocumentFileType = 'md' | 'txt';

export type ResumeFileType = 'docx' | 'pdf';

export interface FileAssetListItem {
  /** 类型：字符串；含义：文件唯一标识；是否必填：是；默认值：无 */
  id: string;
  /** 类型：ArchiveModuleKey；含义：所属模块；是否必填：是；默认值：无 */
  module: ArchiveModuleKey;
  /** 类型：字符串或 null；含义：文件分类；是否必填：否；默认值：null */
  category: string | null;
  /** 类型：字符串；含义：文件标题；是否必填：是；默认值：无 */
  title: string;
  /** 类型：字符串；含义：原始文件名；是否必填：是；默认值：无 */
  originalName: string;
  /** 类型：字符串；含义：文件存储路径；是否必填：是；默认值：无 */
  storagePath: string;
  /** 类型：字符串；含义：文件 MIME 类型；是否必填：是；默认值：无 */
  mimeType: string;
  /** 类型：数字；含义：文件大小；是否必填：是；默认值：0 */
  size: number;
  /** 类型：字符串或 null；含义：备注；是否必填：否；默认值：null */
  remark: string | null;
  /** 类型：字符串；含义：更新时间；是否必填：是；默认值：数据库生成 */
  updatedAt: string;
}

export interface DocumentListItem extends FileAssetListItem {
  /** 类型：DocumentFileType；含义：文档文件类型；是否必填：是；默认值：由文件扩展名推断 */
  fileType: DocumentFileType;
}

export interface DocumentDetailData extends DocumentListItem {
  /** 类型：字符串；含义：文档正文内容；是否必填：是；默认值：空字符串 */
  content: string;
}

export interface DocumentFormPayload {
  /** 类型：字符串或 undefined；含义：文档记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：文档标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：文档分类；是否必填：否；默认值：空字符串 */
  category: string;
  /** 类型：DocumentFileType；含义：文档文件类型；是否必填：是；默认值：md */
  fileType: DocumentFileType;
  /** 类型：字符串；含义：原始文件名；是否必填：否；默认值：根据标题生成 */
  originalName: string;
  /** 类型：字符串；含义：文档正文内容；是否必填：否；默认值：空字符串 */
  content: string;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

export interface ResumeFormPayload {
  /** 类型：字符串或 undefined；含义：简历记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：简历标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：简历分类；是否必填：否；默认值：通用 */
  category: string;
  /** 类型：File 或 undefined；含义：上传的简历文件；是否必填：新增时必填；默认值：undefined */
  file?: File;
  /** 类型：字符串；含义：备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

export interface ImageFormPayload {
  /** 类型：字符串或 undefined；含义：图片记录唯一标识；是否必填：编辑时必填；默认值：undefined */
  id?: string;
  /** 类型：字符串；含义：图片标题；是否必填：是；默认值：空字符串 */
  title: string;
  /** 类型：字符串；含义：图片分类；是否必填：否；默认值：证件照 */
  category: string;
  /** 类型：File 或 undefined；含义：上传或替换的图片文件；是否必填：新增时必填；默认值：undefined */
  file?: File;
  /** 类型：字符串；含义：图片备注；是否必填：否；默认值：空字符串 */
  remark: string;
}

export interface ModuleDetailData {
  /** 类型：ArchiveModuleConfig；含义：模块配置；是否必填：是；默认值：无 */
  module: ArchiveModuleConfig;
  /** 类型：PasswordListItem[]、DocumentListItem[] 或 FileAssetListItem[]；含义：模块列表数据；是否必填：是；默认值：空数组 */
  items: PasswordListItem[] | DocumentListItem[] | FileAssetListItem[];
}
