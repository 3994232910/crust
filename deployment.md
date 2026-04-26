# Crust - 部署指南

你可以使用 Docker Compose 将项目部署到远程服务器。

本项目期望使用 Traefik 反向代理处理外部通信和 HTTPS 证书。

你可以使用 CI/CD（持续集成和持续部署）系统自动部署，项目中已包含 GitHub Actions 配置。

但在开始之前，你需要先配置一些必要的环境变量和基础设施。

## 准备工作

- 准备一台可用的远程服务器
- 配置域名的 DNS 记录，指向你创建的服务器 IP
- 配置通配符子域名（如 *.crust.cyou），以便为不同服务创建多个子域名
  - 例如：dashboard.crust.cyou、api.crust.cyou、traefik.crust.cyou、adminer.crust.cyou
  - 也适用于 staging 环境：dashboard.staging.crust.cyou、adminer.staging.crust.cyou
- 在远程服务器上安装并配置 Docker（Docker Engine，非 Docker Desktop）

## 公共 Traefik 代理

我们需要一个 Traefik 代理来处理 incoming 连接和 HTTPS 证书。

以下步骤只需执行一次。

### Traefik Docker Compose 配置

- 在远程服务器上创建目录用于存放 Traefik Docker Compose 文件：

```bash
mkdir -p /root/code/traefik-public/
```

- 将 Traefik Docker Compose 文件复制到你的服务器。在本地终端执行：

```bash
rsync -a compose.traefik.yml root@your-server.example.com:/root/code/traefik-public/
```

### 创建 Traefik 公共网络

Traefik 需要一个名为 `traefik-public` 的 Docker 公共网络来与你的应用栈通信。

这样可以实现单个公共 Traefik 代理处理所有 HTTP 和 HTTPS 流量，背后可以运行一个或多个不同的应用栈，即使它们在同一台服务器上。

在远程服务器上执行以下命令创建 Docker 公共网络：

```bash
docker network create traefik-public
```

### 设置 Traefik 环境变量

Traefik Docker Compose 文件需要设置一些环境变量。在远程服务器上执行以下命令：

- 创建 HTTP Basic Auth 用户名：

```bash
export USERNAME=admin
```

- 创建 HTTP Basic Auth 密码：

```bash
export PASSWORD=changethis
```

- 使用 openssl 生成密码的哈希值并存储到环境变量：

```bash
export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
```

验证哈希密码是否正确：

```bash
echo $HASHED_PASSWORD
```

- 设置服务器域名：

```bash
export DOMAIN=crust.cyou
```

- 设置 Let's Encrypt 邮箱（用于 SSL 证书）：

```bash
export EMAIL=admin@crust.cyou
```

注意：必须使用真实有效的邮箱地址，@example.com 无法通过验证。

### 启动 Traefik

进入 Traefik Docker Compose 文件所在目录：

```bash
cd /root/code/traefik-public/
```

环境变量设置完成后，启动 Traefik：

```bash
docker compose -f compose.traefik.yml up -d
```

## 部署 Crust 应用

Traefik 就绪后，你可以使用 Docker Compose 部署 Crust 应用。

注意：你也可以直接使用 GitHub Actions 进行自动化部署（见下文）。

### 复制代码到服务器

```bash
rsync -av --filter=":- .gitignore" ./ root@your-server.example.com:/root/code/app/
```

说明：`--filter=":- .gitignore"` 让 rsync 遵循 git 的忽略规则，排除虚拟环境等不必要的文件。

### 设置环境变量

#### 生成密钥

`.env` 文件中部分变量的默认值为 `changethis`，你需要替换为安全的密钥。

生成安全密钥：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

复制输出内容作为密码或密钥，可多次执行以生成不同的密钥。

#### 必需的环境变量

设置环境变量 `ENVIRONMENT`，默认为 `local`（开发环境），部署时设置为 `staging` 或 `production`：

```bash
export ENVIRONMENT=production
```

设置 `DOMAIN`，默认为 `localhost`（开发环境），部署时使用你的实际域名：

```bash
export DOMAIN=crust.cyou
```

设置 `POSTGRES_PASSWORD`，替换默认值：

```bash
export POSTGRES_PASSWORD="your_secure_password"
```

设置 `SECRET_KEY`，用于签名 JWT token：

```bash
export SECRET_KEY="your_generated_secret_key"
```

提示：使用上述 Python 命令生成安全密钥。

设置 `FIRST_SUPERUSER_PASSWORD`，初始超级用户密码：

```bash
export FIRST_SUPERUSER_PASSWORD="your_secure_password"
```

设置 `BACKEND_CORS_ORIGINS`，包含你的域名：

```bash
export BACKEND_CORS_ORIGINS="https://dashboard.${DOMAIN?Variable not set},https://api.${DOMAIN?Variable not set}"
```

#### 其他可选环境变量

- PROJECT_NAME: 项目名称，用于 API 文档和邮件
- STACK_NAME: Docker Compose 标签和项目名使用的栈名称，不同环境应使用不同名称
  - 例如：crust-cyou 和 staging-crust-cyou（将域名中的点替换为横杠）
- BACKEND_CORS_ORIGINS: 允许的 CORS 源列表，用逗号分隔
- FIRST_SUPERUSER: 第一个超级用户的邮箱地址，该用户可以创建新用户
- SMTP_HOST: SMTP 服务器主机（如 Mailgun、Sparkpost、Sendgrid 等）
- SMTP_USER: SMTP 服务器用户名
- SMTP_PASSWORD: SMTP 服务器密码
- EMAILS_FROM_EMAIL: 发送邮件的邮箱地址
- POSTGRES_SERVER: PostgreSQL 服务器主机名，默认为 `db`（Docker Compose 提供）
- POSTGRES_PORT: PostgreSQL 服务器端口，使用默认值即可
- POSTGRES_USER: PostgreSQL 用户名，使用默认值即可
- POSTGRES_DB: 数据库名称，默认为 `app`
- SENTRY_DSN: Sentry DSN（如果使用 Sentry 错误追踪）

### GitHub Actions 环境变量

以下环境变量仅由 GitHub Actions 使用：

- LATEST_CHANGES: 个人访问令牌，用于 GitHub Action [latest-changes](https://github.com/tiangolo/latest-changes) 自动生成发布说明
- SMOKESHOW_AUTH_KEY: 用于处理和发布代码覆盖率报告，参考 [Smokeshow](https://github.com/samuelcolvin/smokeshow) 创建免费密钥

### 使用 Docker Compose 部署

环境变量设置完成后，执行以下命令部署：

```bash
cd /root/code/app/
docker compose -f compose.yml build
docker compose -f compose.yml up -d
```

注意：生产环境不应使用 `compose.override.yml` 中的覆盖配置，因此我们明确指定使用 `compose.yml`。

## 持续部署（CD）

你可以使用 GitHub Actions 实现自动化部署。

项目已配置两个环境：`staging` 和 `production`。

### 安装 GitHub Actions Runner

- 在远程服务器上创建 GitHub Actions 用户：

```bash
sudo adduser github
```

- 为 `github` 用户添加 Docker 权限：

```bash
sudo usermod -aG docker github
```

- 切换到 `github` 用户：

```bash
sudo su - github
```

- 进入 `github` 用户的主目录：

```bash
cd
```

- 按照[官方指南安装 GitHub Actions self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners#adding-a-self-hosted-runner-to-a-repository)

- 当询问标签时，添加环境标签，如 `production`（也可稍后添加）

安装完成后，指南会告诉你运行命令启动 runner。但该进程会在终端关闭或连接断开时停止。

为确保开机自启并持续运行，需要将其安装为服务。退出 `github` 用户，返回 `root` 用户：

```bash
exit
```

此时你将回到之前的用户和目录。

切换回 `root` 用户（如果还不是）：

```bash
sudo su
```

- 以 `root` 身份进入 `github` 用户的 actions-runner 目录：

```bash
cd /home/github/actions-runner
```

- 以 `github` 用户身份安装 self-hosted runner 服务：

```bash
./svc.sh install github
```

- 启动服务：

```bash
./svc.sh start
```

- 检查服务状态：

```bash
./svc.sh status
```

更多信息请参考官方指南：[Configuring the self-hosted runner application as a service](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/configuring-the-self-hosted-runner-application-as-a-service)。

### 设置仓库密钥

在你的 GitHub 仓库中配置密钥（secrets），包括上述所有环境变量（如 SECRET_KEY 等）。

参考[官方 GitHub 指南设置仓库密钥](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)。

当前 GitHub Actions 工作流需要以下密钥：

- DOMAIN_PRODUCTION
- DOMAIN_STAGING
- STACK_NAME_PRODUCTION
- STACK_NAME_STAGING
- EMAILS_FROM_EMAIL
- FIRST_SUPERUSER
- FIRST_SUPERUSER_PASSWORD
- POSTGRES_PASSWORD
- SECRET_KEY
- LATEST_CHANGES
- SMOKESHOW_AUTH_KEY

## GitHub Actions 部署工作流

`.github/workflows` 目录中已配置好部署工作流，对应不同环境（GitHub Actions runner 标签）：

- staging: 推送（或合并）到 `master` 分支后自动部署
- production: 发布 release 后自动部署

如需添加其他环境，可以以上述配置为基础进行修改。

## 服务地址

将示例中的 `crust.cyou` 替换为你的实际域名。

### Traefik 主控制面板

Traefik UI: https://traefik.crust.cyou

### 生产环境

前端: https://dashboard.crust.cyou

后端 API 文档: https://api.crust.cyou/docs

后端 API 基础 URL: https://api.crust.cyou

Adminer 数据库管理: https://adminer.crust.cyou

### Staging 环境

前端: https://dashboard.staging.crust.cyou

后端 API 文档: https://api.staging.crust.cyou/docs

后端 API 基础 URL: https://api.staging.crust.cyou

Adminer 数据库管理: https://adminer.staging.crust.cyou
