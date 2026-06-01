# 个人档案 Archive 开发规范

本文档是本项目的核心协作规范。所有代码、注释、数据库变更、文档更新和自动化操作都必须遵循本文档。

## 一、项目介绍

个人档案 Archive 是一个本地优先的私人资料管理系统，用于集中保存和管理个人重要信息。项目支持账号密码、文档、简历、图片、证件和学习资料等模块，适合个人长期沉淀工作记录、生活资料和数字资产。

项目默认使用 SQLite 保存结构化数据，使用本地 `uploads/` 目录保存上传文件。系统通过用户账号隔离数据，默认包含演示账号 `demo` 和个人账号 `xinjie`。

## 二、技术栈

- Nuxt 4
- Vue 3
- TypeScript
- SCSS
- Element Plus
- SQLite
- better-sqlite3
- ofetch

## 三、功能边界

当前项目主要包含以下模块：

- 我的密码：平台账号、登录方式、密码、手机号、邮箱和备注。
- 我的文档：工作记录、项目说明、备忘、模板。
- 我的简历：不同岗位、语言和用途的简历文件。
- 我的图片：证件照、自拍照、生活照和工作照。
- 我的证件：身份证、学历证明、入职材料等证件文件。
- 学习资料：前端、后端、数据库、AI相关资料。

新增功能必须优先复用现有模块、接口、类型和组件模式，不得随意引入新架构。

## 四、目录规范

项目目录必须保持以下边界：

```text
src/
├── assets/                  # 静态资源，如登录页背景图
├── components/
│   ├── commons/             # 通用组件，每个组件独立目录
│   └── business/            # 业务组件，每个组件独立目录
├── composables/             # Nuxt/Vue 组合式函数
├── constants/               # 应用常量、模块常量、分类常量
├── pages/                   # Nuxt 页面路由
├── styles/                  # reset、global、variables、mixins
├── types/                   # API、模型、通用类型
└── utils/                   # 前端工具，如 request 封装

server/
├── api/                     # Nuxt 服务端 API 路由
└── utils/                   # 数据库、文件、鉴权、响应工具
```

公共组件目录格式：

```text
src/components/commons/组件名/
├── index.vue
└── index.scss
```

业务组件目录格式：

```text
src/components/business/组件名/
├── index.vue
└── index.scss
```

## 五、TypeScript 规范

- 必须使用 TypeScript。
- 禁止使用 `any`。
- API 请求、API 响应、数据库行、组件 Props、表单数据必须定义明确类型。
- 捕获异常必须使用 `unknown`，再通过类型判断处理。
- 不允许假设接口结构，必须以 `src/types`、服务端工具类型或实际返回结构为准。
- 未使用变量、函数、import、样式必须清理。

## 六、Vue / Nuxt 规范

- 组件必须使用 Vue 3 `<script setup lang="ts">`。
- 禁止 class component。
- 页面放在 `src/pages`。
- 业务状态优先使用 `ref`、`computed`、`useState` 和现有 composable。
- 跨页面会话状态优先复用 `src/composables/useArchiveSession.ts`。
- 不得新增 Pinia、Zustand、Redux 等状态库，除非有明确需求并经过确认。
- Element Plus 图标优先使用 `@element-plus/icons-vue`。

组件文件头部必须包含中文注释：

```ts
/**
 * @component 组件名称
 * @description 组件描述
 * @author
 * @created
 * @updated
 */
```

组件 Props 或接口字段必须用中文注释说明：

- 类型
- 含义
- 是否必填
- 默认值

## 七、SCSS / UI 规范

- 样式优先使用 SCSS。
- 组件样式放在组件同目录 `index.scss`。
- 组件内通过 `<style scoped lang="scss">@use "./index.scss";</style>` 引入。
- 禁止随意污染全局样式，确需全局选择器时必须说明原因并控制范围。
- class 命名使用语义化 BEM 风格，如 `entry-gate__panel`。
- 每个 SCSS 文件头部必须包含中文说明：

```scss
/**
 * 文件说明：
 * 样式说明：
 * 关键布局说明：
 */
```

UI 修改必须符合当前项目风格：

- 私人档案系统整体采用克制、清晰、工作台式布局。
- 登录页可使用更具氛围感的背景图和玻璃质感，但不得影响可读性。
- 管理页面优先保证信息密度、列表可读性和操作效率。
- 固定高度、滚动区域和响应式布局必须明确处理，避免内容被裁切。

## 八、API 规范

- 前端请求必须通过 `src/utils/request.ts` 或现有封装发起。
- 服务端接口必须放在 `server/api`。
- API 必须返回统一结构：

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

错误响应必须返回：

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "错误描述（中文）",
  "data": null
}
```

- 新接口必须复用 `server/utils/apiResponse.ts`。
- 需要登录态的接口必须从会话中获取当前用户，不得信任前端传入的用户标识。
- 不允许跳过鉴权。
- 必须处理 loading 和 error。
- API 请求失败必须给用户可理解的中文错误信息。

## 九、数据库规范

- 数据库使用 SQLite 和 `better-sqlite3`。
- 数据库连接、初始化和迁移逻辑集中在 `server/utils/database.ts`。
- 查询必须使用参数化语句，禁止拼接用户输入。
- 新表、新字段、新迁移必须有中文注释说明用途。
- 所有用户数据必须通过 `user_id` 或当前会话用户隔离。
- 不得假设数据库结构，修改前必须阅读现有建表和迁移逻辑。
- 数据库文件 `data/*.db` 和 WAL/SHM 文件不得提交。

## 十、文件存储规范

- 上传文件默认保存在 `uploads/`。
- 文件索引统一写入 `file_assets`。
- 文档、简历、图片、证件、学习资料统一使用文件资产模型，不得另建重复模型，除非需求明确。
- 文件路径必须经过服务端校验，禁止路径穿越。
- 删除文件时必须同时考虑数据库索引和磁盘文件一致性。
- `uploads/*` 不得提交到 Git。

## 十一、安全规范

- 禁止硬编码真实密码、密钥、Token、数据库凭据。
- 默认密码只能用于本地演示，生产环境必须通过 `.env` 覆盖。
- 必须保护以下环境变量：
  - `NUXT_SESSION_SECRET`
  - `NUXT_FILE_PREVIEW_SECRET`
  - `NUXT_PERSONAL_ACCOUNT_PASSWORD`
  - `NUXT_DEMO_ACCOUNT_PASSWORD`
- 所有 POST/PUT/DELETE 请求必须符合现有 CSRF 机制。
- 用户输入必须避免 XSS 风险，不得使用不可信 HTML。
- 日志不得输出密码、Token、会话密钥、文件预览密钥。

## 十二、开发流程

修改代码前必须：

1. 阅读相关现有代码。
2. 理解当前业务逻辑和数据流。
3. 确认是否有现有工具函数、类型、组件可以复用。
4. 再进行最小范围修改。

新增功能流程：

1. 分析需求。
2. 确认数据模型和接口边界。
3. 定义 TypeScript 类型。
4. 编写服务端接口或复用现有接口。
5. 编写 Vue 组件和 SCSS。
6. 接入 loading、error、empty 状态。
7. 执行自检和必要命令。

Debug 流程：

1. 复现或定位报错。
2. 找到根因。
3. 最小化修复。
4. 验证修复结果。

## 十三、验证规范

代码变更后优先执行：

```bash
npm run typecheck
npm run build
```

涉及 lint 规则、未使用代码或格式问题时执行：

```bash
npm run lint
```

文档变更无需强制构建，但必须检查内容是否与项目实际一致。

## 十四、Git 规范

- 提交信息必须使用中文。
- 每次提交只包含同一主题的变更。
- 不得把无关改动混入提交。
- 提交前必须检查：

```bash
git status --short
git diff --check
git diff --cached --name-status
```

- `.env`、数据库文件、上传文件、日志文件、构建产物不得提交。

## 十五、文件删除规范

禁止批量删除文件或目录。不要使用：

- `del /s`
- `rd /s`
- `rmdir /s`
- `Remove-Item -Recurse`
- `rm -rf`

需要删除文件时，只能一次删除一个明确路径的文件。

如果需要批量删除文件，必须停止操作并请求用户手动删除。

## 十六、日志和临时文件规范

- `*.log` 文件不得提交。
- `.nuxt`、`.output`、`node_modules`、`dist` 不得提交。
- 开发日志可以本地保留，但清理时必须遵守文件删除规范。
- 生产环境不得保留调试 `console` 或输出敏感数据。

## 十七、AI 协作约束

AI 必须遵守：

1. 不编造接口、字段、数据库表或业务规则。
2. 不跳过鉴权、安全校验、错误处理。
3. 不生成未使用代码。
4. 不修改无关文件。
5. 不擅自删除用户文件或批量清理目录。
6. 不在未确认时引入新依赖或新状态管理方案。
7. 不确定需求时必须先阅读代码；仍不明确时再询问用户。
8. 发现已有工作区改动时，必须保护用户改动，不得随意回滚。

## 十八、项目原则

> 优先保证数据安全和可维护性，其次保证功能正确性，最后才是开发速度。

本项目管理的是个人重要资料。任何改动都必须优先考虑数据不丢失、权限不绕过、文件不误删、体验不误导。
