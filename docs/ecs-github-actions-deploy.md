# ECS 使用 GitHub Actions 自动部署

本文档说明本项目推荐的生产部署方式：GitHub Actions 通过 SSH 登录 ECS，在 ECS 上拉取最新代码、安装依赖、构建并重启 PM2 服务。

## 为什么在 ECS 上构建

本项目使用 SQLite 和本地上传目录：

```text
/var/www/archive-data/data/archive.db
/var/www/archive-data/uploads
```

这些文件必须长期保存在 ECS 上，不能随着 GitHub Actions 构建产物一起覆盖。因此推荐让 GitHub Actions 只负责远程执行部署命令，数据库和上传文件一直留在 ECS。

## ECS 目录建议

建议在 ECS 上使用以下目录：

```text
/var/www/archive               # 项目代码
/var/www/archive-data/data     # SQLite 数据库
/var/www/archive-data/uploads  # 上传文件
```

初始化目录：

```bash
sudo mkdir -p /var/www/archive
sudo mkdir -p /var/www/archive-data/data
sudo mkdir -p /var/www/archive-data/uploads
```

如果使用普通用户部署，需要确保该用户有这些目录的读写权限。

## ECS 首次准备

安装 Node.js、Git 和 PM2：

```bash
npm install -g pm2
```

准备项目目录：

```bash
sudo mkdir -p /var/www/archive
cd /var/www/archive
```

GitHub Actions 首次部署时会在该目录中自动初始化 Git 仓库并拉取 `main` 分支，不要求你提前手动 `git clone`。

创建生产环境变量文件：

```bash
vim /var/www/archive/.env.production
```

首次部署前 `/var/www/archive` 里可能还没有项目代码，所以不能依赖 `cp .env.production.example .env.production`。直接在 ECS 上创建 `/var/www/archive/.env.production`，内容可以参考仓库里的 `.env.production.example`。至少需要配置：

```text
NUXT_PUBLIC_ORIGIN
NUXT_SESSION_SECRET
NUXT_FILE_PREVIEW_SECRET
NUXT_DATABASE_PATH
NUXT_UPLOADS_DIR
NUXT_PERSONAL_ACCOUNT_PASSWORD
NUXT_DEMO_ACCOUNT_PASSWORD
```

推荐生产路径：

```text
NUXT_DATABASE_PATH=/var/www/archive-data/data/archive.db
NUXT_UPLOADS_DIR=/var/www/archive-data/uploads
```

首次手动构建和启动：

```bash
npm ci
npm run build
pm2 start npm --name archive -- run start
pm2 save
```

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
ECS_APP_DIR   # 项目目录，默认 /var/www/archive
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
SSH 登录 ECS
  -> 进入 /var/www/archive
  -> 初始化或更新 Git 仓库
  -> 拉取 main 分支代码
  -> 检查 .env.production
  -> 创建 /var/www/archive-data/data 和 /var/www/archive-data/uploads
  -> npm ci
  -> npm run build
  -> pm2 restart archive --update-env
```

如果 PM2 中还没有 `archive` 进程，工作流会自动执行：

```bash
pm2 start npm --name archive -- run start
```

## Nginx 反向代理示例

Node 服务默认监听：

```text
http://127.0.0.1:3000
```

Nginx 可以反向代理到该端口：

```nginx
server {
  listen 80;
  server_name archive.example.com;

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

生产环境建议配置 HTTPS，并把 `.env.production` 中的 `NUXT_PUBLIC_ORIGIN` 改成 HTTPS 地址。

## 注意事项

`.env.production` 不提交到 Git，只保存在 ECS。

`/var/www/archive-data/data` 和 `/var/www/archive-data/uploads` 不要放在每次发布会被覆盖的目录里。

上线前务必修改默认账号密码和签名密钥。

备份时至少备份：

```text
/var/www/archive-data/data
/var/www/archive-data/uploads
```

SQLite 使用 WAL 模式时，备份最好在服务停止后进行，或者使用 SQLite 在线备份方案。
