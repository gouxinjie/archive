export interface ApiSuccessResponse<T> {
  /** 类型：布尔值；含义：请求是否成功；是否必填：是；默认值：true */
  success: true;
  /** 类型：数字；含义：成功状态码；是否必填：是；默认值：200 */
  code: 200;
  /** 类型：字符串；含义：响应提示；是否必填：是；默认值：操作成功 */
  message: string;
  /** 类型：泛型；含义：响应数据；是否必填：是；默认值：由接口决定 */
  data: T;
}

export interface ApiErrorResponse {
  /** 类型：布尔值；含义：请求是否成功；是否必填：是；默认值：false */
  success: false;
  /** 类型：字符串；含义：业务错误码；是否必填：是；默认值：无 */
  code: string;
  /** 类型：字符串；含义：中文错误描述；是否必填：是；默认值：无 */
  message: string;
  /** 类型：null；含义：错误响应无数据；是否必填：是；默认值：null */
  data: null;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthStatusData {
  /** 类型：布尔值；含义：是否已经设置个人密码；是否必填：是；默认值：false */
  hasPassword: boolean;
  /** 类型：布尔值；含义：当前访问是否已解锁；是否必填：是；默认值：false */
  authenticated: boolean;
}

export interface CsrfTokenData {
  /** 类型：字符串；含义：CSRF 令牌；是否必填：是；默认值：服务端生成 */
  token: string;
}

export interface DashboardSummaryData {
  /** 类型：数字；含义：密码记录数量；是否必填：是；默认值：0 */
  passwordCount: number;
  /** 类型：数字；含义：文档数量；是否必填：是；默认值：0 */
  documentCount: number;
  /** 类型：数字；含义：简历数量；是否必填：是；默认值：0 */
  resumeCount: number;
  /** 类型：数字；含义：图片数量；是否必填：是；默认值：0 */
  imageCount: number;
  /** 类型：数字；含义：证件数量；是否必填：是；默认值：0 */
  certificateCount: number;
  /** 类型：数字；含义：学习资料数量；是否必填：是；默认值：0 */
  studyCount: number;
}

export interface ModuleQueryData {
  /** 类型：字符串；含义：搜索关键词；是否必填：否；默认值：空字符串 */
  keyword?: string;
}
