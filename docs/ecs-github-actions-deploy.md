# ECS 使用 GitHub Actions 自动部署

本文档说明本项目的生产部署方式：GitHub Actions 在云端构建 Nuxt 产物，把 `.output` 打包上传到 ECS 的 `/var/www/archive`，然后通过 PM2 启动或重载服务。

## 部署目录

建议在 ECS 上使用以下目录：

```text
/var/www/archive                    # 部署根目录，直接放运行产物
/var/www/archive/.env.production    # 生产环境变量，只保存在 ECS
/var/www/archive/.output            # Nuxt 生产构建产物
/var/www/archive/ecosystem.config.cjs # PM2 进程配置
/var/www/archive-data/data          # SQLite 数据库
/var/www/archive-data/uploads       # 上传文件
```

初始化目录：

```bash
sudo mkdir -p /var/www/archive
sudo mkdir -p /var/www/archive-data/data
sudo mkdir -p /var/www/archive-data/uploads
```

如果使用普通用户部署，需要确保该用户有这些目录的读写权限。

## ECS 首次准备

安装 Node.js、Git、tar、npm 和 PM2。Node.js 版本必须与 GitHub Actions 构建环境保持同一大版本，当前工作流使用 Node.js 20。

```bash
npm install -g pm2
```

创建生产环境变量文件：

```bash
vim /var/www/archive/.env.production
```

内容可以参考仓库中的 `.env.production.example`。至少需要配置：

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
NUXT_PUBLIC_ORIGIN=http://你的域名或公网IP:8081
NUXT_SESSION_SECRET=随机强密钥
NUXT_FILE_PREVIEW_SECRET=随机强密钥
NUXT_DATABASE_PATH=/var/www/archive-data/data/archive.db
NUXT_UPLOADS_DIR=/var/www/archive-data/uploads
NUXT_PERSONAL_ACCOUNT_PASSWORD=你的个人账号密码
NUXT_DEMO_ACCOUNT_PASSWORD=123456
```

`.env.production` 不提交到 Git，也不需要放进 GitHub Secrets。它只保存在 ECS 的 `/var/www/archive/.env.production`。

## GitHub Secrets

在 GitHub 仓库中进入：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加以下 Secrets：

```text
ECS_HOST      # ECS 公网 IP 或域名
ECS_USER      # SSH 用户，例如 root 或 deploy
ECS_SSH_KEY   # SSH 私钥内容
ECS_PORT      # SSH 端口，默认 22
ECS_APP_DIR   # 部署根目录，默认 /var/www/archive
ECS_DATA_ROOT # 持久化数据根目录，默认 /var/www/archive-data
```

`ECS_APP_DIR` 可不填，工作流默认使用：

```text
/var/www/archive
```

`ECS_DATA_ROOT` 可不填，工作流默认使用：

```text
/var/www/archive-data
```

## 自动部署流程

工作流文件：

```text
.github/workflows/deploy-ecs.yml
```

触发方式：

1. 推送到 `main` 分支自动部署。
2. 在 GitHub Actions 页面手动点击 `workflow_dispatch` 部署。

执行流程：

```text
GitHub Actions
  -> checkout main
  -> npm ci
  -> npm run build:local
  -> 打包 .output 和 ecosystem.config.cjs
  -> 上传到 ECS /var/www/archive/deploy-artifact.tar.gz

ECS
  -> 解压覆盖到 /var/www/archive
  -> 删除临时压缩包 deploy-artifact.tar.gz
  -> PM2 startOrReload /var/www/archive/ecosystem.config.cjs
```

PM2 会读取 `/var/www/archive/.env.production`，并启动：

```text
/var/www/archive/.output/server/index.mjs
```

## Nginx 反向代理示例

Node 服务由 PM2 启动，只监听 ECS 本机：

```text
http://127.0.0.1:3000
```

Nginx 对外监听 `8081`，再反向代理到本机 `3000`：

```nginx
server {
  listen 8081;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

如果后续绑定域名并配置 HTTPS，可以再把 `listen 8081` 调整为 HTTPS 配置，并同步修改 `.env.production` 中的 `NUXT_PUBLIC_ORIGIN`。

## 注意事项

`/var/www/archive` 现在是部署根目录，不要求保存完整源码。GitHub Actions 会直接覆盖 `.output` 和 `ecosystem.config.cjs`。

`/var/www/archive-data/data` 和 `/var/www/archive-data/uploads` 是持久化数据目录，不要放在每次发布会被覆盖的目录里。

直接覆盖部署更简单，但没有 release 目录回滚能力。如果新版本异常，需要重新运行上一次稳定提交的 workflow。

项目使用了 `better-sqlite3`，它是原生模块。GitHub Actions 构建产物所用的 Node.js 大版本必须与 ECS 运行时一致，否则会出现原生模块加载失败。当前工作流固定使用 Node.js 20，并会在部署时校验 ECS 也是 20.x。

备份时至少备份：

```text
/var/www/archive/.env.production
/var/www/archive-data/data
/var/www/archive-data/uploads
```

SQLite 使用 WAL 模式时，备份最好在服务停止后进行，或者使用 SQLite 在线备份方案。
