# 个人档案 Archive

个人档案是一个本地优先的私人资料管理系统，用来集中保存账号密码、文档资料、简历文件、图片、证件和学习资料。项目面向个人使用场景，默认使用 SQLite 存储结构化数据，并将上传文件保存在本地目录。

## 功能模块

- 我的密码：保存平台名称、分类、登录方式、账号、密码、手机号、邮箱和备注。
- 我的文档：按工作记录、项目说明、备忘、模板分类管理文件。
- 我的简历：管理不同岗位、语言和用途的简历文件，并支持预览访问。
- 我的图片：保存证件照、自拍照、生活照和工作照等图片资料。
- 我的证件：保存身份证、学历证明、入职材料等证件文件。
- 学习资料：按前端、后端、数据库、AI相关分类管理学习文件。

## 技术栈

- Nuxt 4
- Vue 3
- TypeScript
- SCSS
- Element Plus
- SQLite
- better-sqlite3

## 目录说明

```text
archive/
├── data/                    # SQLite 数据库默认目录
├── uploads/                 # 上传文件默认目录
├── scripts/                 # 开发数据脚本
├── server/                  # Nuxt 服务端接口和工具
│   ├── api/                 # API 路由
│   └── utils/               # 数据库、文件、鉴权和响应工具
├── src/
│   ├── assets/              # 登录页背景等静态资源
│   ├── components/          # 通用组件和业务组件
│   ├── composables/         # 组合式函数
│   ├── constants/           # 模块、分类和应用常量
│   ├── pages/               # 页面路由
│   ├── styles/              # 全局样式、变量和 mixin
│   ├── types/               # TypeScript 类型
│   └── utils/               # 前端请求封装
├── nuxt.config.ts           # Nuxt 配置
└── package.json             # 项目脚本和依赖
```

## 环境要求

- Node.js 需要满足 Nuxt 4 的运行要求。
- Windows、macOS、Linux 均可运行。
- 本地开发不需要额外安装数据库服务，SQLite 数据库文件会自动创建。

## 本地启动

```bash
npm install
npm run dev
```

启动后打开终端输出中的本地地址，通常是：

```text
http://localhost:3000
```

当前登录页默认填入演示账号：

```text
账号：demo
密码：123456
```

## 环境变量

本地开发可以复制 `.env.example` 为 `.env`，然后按需要修改：

```bash
cp .env.example .env
```

常用配置：

```text
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
NUXT_PUBLIC_ORIGIN=http://localhost:3000
NUXT_OWNER_USER_ID=owner
NUXT_SESSION_SECRET=please-change-to-a-random-32-character-dev-secret
NUXT_FILE_PREVIEW_SECRET=please-change-file-preview-dev-secret-32
NUXT_DATABASE_PATH=./data/archive.db
NUXT_UPLOADS_DIR=./uploads
NUXT_PERSONAL_ACCOUNT_PASSWORD=xinjie123
NUXT_DEMO_ACCOUNT_PASSWORD=123456
```

说明：

- `NODE_ENV`：运行环境，本地开发使用 `development`，生产部署必须为 `production`。
- `HOST` / `PORT`：Nuxt 服务监听地址和端口。
- `NUXT_PUBLIC_ORIGIN`：生产访问地址，必须改为 ECS 域名或公网 IP，可按 Nginx 对外端口填写。
- `NUXT_OWNER_USER_ID`：单人系统请求标识，通常保持 `owner`。
- `NUXT_SESSION_SECRET`：会话签名密钥，部署时必须替换为随机字符串。
- `NUXT_FILE_PREVIEW_SECRET`：文件预览访问密钥，部署时必须替换。
- `NUXT_DATABASE_PATH`：SQLite 数据库文件路径。
- `NUXT_UPLOADS_DIR`：上传文件保存目录。
- `NUXT_PERSONAL_ACCOUNT_PASSWORD`：个人账号默认密码。
- `NUXT_DEMO_ACCOUNT_PASSWORD`：演示账号默认密码。

ECS 生产部署可以复制 `.env.production.example` 为 `.env.production`：

```bash
cp .env.production.example .env.production
```

生产模板默认使用以下持久化目录：

```text
NUXT_DATABASE_PATH=/var/www/archive-data/data/archive.db
NUXT_UPLOADS_DIR=/var/www/archive-data/uploads
```

## 常用命令

```bash
npm run dev
```

启动本地开发服务。

```bash
npm run typecheck
```

执行 Nuxt TypeScript 类型检查。

```bash
npm run build
```

加载 `.env.production` 并构建生产版本。

```bash
npm run build:local
```

不加载 `.env.production`，仅用于本地临时构建检查。

```bash
npm run start
```

加载 `.env.production` 并启动 `.output` 生产服务。

```bash
npm run preview
```

预览构建产物。

```bash
npm run lint
```

执行 ESLint 检查。

```bash
npm run db:seed
```

写入开发演示数据。

## 数据存储

项目默认使用本地文件存储：

- 数据库：`data/archive.db`
- 上传文件：`uploads/`

数据库会在服务启动时自动初始化，主要包含：

- `users`：用户账号。
- `password_items`：密码资料。
- `file_assets`：文档、简历、图片、证件和学习资料的文件索引。
- `archive_profiles`：历史档案配置兼容表。
- `app_settings`：应用配置。

## 账号与数据隔离

系统按用户账号隔离数据。默认会初始化：

- `demo`：演示账号，默认密码 `123456`。
- `xinjie`：个人账号，默认密码来自 `NUXT_PERSONAL_ACCOUNT_PASSWORD`，未配置时为 `xinjie123`。

生产或公网部署时必须修改默认密码和密钥。

## 开发约定

- 前端使用 Vue 3 函数组件写法和 TypeScript。
- 样式优先使用 SCSS，并按组件隔离。
- 服务端接口统一返回 `success`、`code`、`message`、`data`。
- 数据库查询使用参数化语句，禁止拼接用户输入。
- 上传文件和数据库文件不应提交到 Git。

## 部署提示

ECS 推荐部署根目录为：

```text
/var/www/archive
```

使用 GitHub Actions 自动部署时，该目录保存 `.env.production`、`.output` 和 `ecosystem.config.cjs`，不要求保存完整源码。

生产推荐访问链路：

```text
公网访问 8081 -> Nginx -> 127.0.0.1:3000 -> Nuxt/PM2
```

构建生产版本：

```bash
npm run build
```

`npm run build` 会自动读取 `.env.production`。如果 ECS 上没有该文件，命令会直接失败，避免误用默认配置构建生产包。

构建完成后，Nuxt 会生成 `.output` 目录。部署时需要保留并配置好：

- `.output`
- `.env.production` 中的生产密钥和密码
- SQLite 数据库目录，ECS 推荐 `/var/www/archive-data/data`
- 上传文件目录，ECS 推荐 `/var/www/archive-data/uploads`

启动生产服务：

```bash
npm run start
```

`npm run start` 同样会自动读取 `.env.production`，确保运行时的 Cookie 密钥、数据库路径和上传目录与构建时一致。

如果使用 GitHub Actions 自动部署到 ECS，参考 [ECS 使用 GitHub Actions 自动部署](./docs/ecs-github-actions-deploy.md)。

生产环境至少需要修改：

- `NUXT_SESSION_SECRET`
- `NUXT_FILE_PREVIEW_SECRET`
- `NUXT_PERSONAL_ACCOUNT_PASSWORD`
- `NUXT_DEMO_ACCOUNT_PASSWORD`

## 开源协议

本项目基于 MIT License 开源，详见 [LICENSE](./LICENSE)。
