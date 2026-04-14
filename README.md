# 🔥 Crust — Knowledge Forge

一个全栈知识管理应用。用树状层级组织 Markdown 笔记，内嵌 3D 模型预览，并通过 AI 工作流对笔记进行总结与大纲梳理。

## 🛠 技术栈

| 层级 | 技术 |
|---|---|
| 后端 | FastAPI、SQLModel、PostgreSQL、pgvector |
| 前端 | React 18、TypeScript、TanStack Router/Query、shadcn/ui、Tailwind CSS 4 |
| AI | LangGraph 工作流，可配置 LLM 与 Embedding 模型 |
| 3D | Three.js + React Three Fiber |
| 认证 | JWT（访问令牌 + 刷新令牌） |
| 基础设施 | Docker Compose、Alembic 数据库迁移、Traefik |

## ✨ 功能特性

- 📁 **Forge 知识树** — 层级文件夹结构，支持无限嵌套的 Markdown 笔记
- ✍️ **Markdown 编辑器** — 支持 GFM、数学公式（KaTeX）、代码高亮
- 🧊 **3D 模型查看器** — 直接在笔记中上传并预览 glTF/GLB 文件
- 🤖 **AI 工作流** — 基于 LangGraph 的笔记总结与大纲生成
- 🔍 **语义搜索** — 每条笔记自动生成 pgvector 向量，支持语义相似度检索
- 👤 **用户管理** — 管理员面板、超级用户权限控制
- 📧 **邮件服务** — 密码找回，本地开发使用 Mailcatcher 拦截邮件

## 🚀 快速开始

### 前置条件

- Docker + Docker Compose
- 将 `.env.example` 复制为 `.env`，并填写必要配置

```bash
cp .env.example .env
# 编辑 .env，至少设置以下三项
```

生成安全密钥：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

需要设置的关键变量：

| 变量 | 说明 |
|---|---|
| `SECRET_KEY` | JWT 签名密钥 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `FIRST_SUPERUSER_PASSWORD` | 初始超级用户密码 |

### 🐋 Docker 启动（推荐）

```bash
docker compose watch        # 全栈启动，支持热重载
```

启动后各服务地址：

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger 文档 | http://localhost:8000/docs |
| Adminer（数据库） | http://localhost:8080 |
| Mailcatcher（邮件） | http://localhost:1080 |

### 💻 本地启动（不使用 Docker）

**后端**（在 `/backend` 目录下）：

```bash
uv sync
alembic upgrade head
fastapi dev app/main.py
```

**前端**（在 `/frontend` 目录下）：

```bash
bun install
bun run dev
```

## 🧑‍💻 开发指南

### 后端

```bash
pytest                                               # 运行全部测试
pytest tests/api/routes/test_forge.py               # 运行单个测试文件
alembic revision --autogenerate -m "描述"           # 生成数据库迁移
alembic upgrade head                                 # 应用迁移
```

### 前端

```bash
bun run build          # TypeScript 检查 + 打包
bun run lint           # Biome 格式化与 lint
bun run test           # Playwright E2E 测试
```

### ⚠️ 修改后端接口后必做

每次修改后端路由或模型后，需重新生成前端 API 客户端：

```bash
bash scripts/generate-client.sh
```

> 前端 `src/client/` 目录为自动生成，请勿手动修改。

## 📁 项目结构

```
crust/
├── backend/
│   └── app/
│       ├── api/routes/     # 路由处理（forge、items、users、dashboard）
│       ├── models/         # SQLModel ORM + Pydantic 数据模型
│       ├── workflows/      # LangGraph AI 工作流（summarize、outline）
│       ├── core/           # 配置、安全、AI 客户端
│       └── crud.py         # 统一 CRUD 层
├── frontend/
│   └── src/
│       ├── routes/         # 基于文件的路由（TanStack Router）
│       ├── components/
│       │   └── Forge/      # 笔记编辑器、3D 渲染器、径向菜单、AI 对话框
│       ├── client/         # 自动生成的 OpenAPI 客户端（勿手动编辑）
│       └── hooks/          # useAuth 等共享 Hook
└── scripts/                # generate-client.sh、test.sh
```

## 🗄 数据模型

```
User 1:N Forge   （Forge.parent_id 自引用，构成树形层级）
User 1:N Item
```

每个 `Forge` 节点在保存时异步计算并存储 pgvector 向量，用于语义检索。

## 🚢 部署

生产环境部署（Traefik + 自动 HTTPS）请参考 [deployment.md](./deployment.md)。

## 📄 许可证

MIT
