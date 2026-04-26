# Crust - Knowledge Forge

全栈知识管理应用。通过树状层级组织 Markdown 笔记，支持 3D 模型预览，并集成 AI 工作流进行笔记总结与大纲梳理。

## 技术栈

后端
- FastAPI + SQLModel
- PostgreSQL + pgvector（向量数据库）
- LangGraph AI 工作流
- JWT 认证（访问令牌 + 刷新令牌）

前端
- React 18 + TypeScript
- TanStack Router + TanStack Query
- shadcn/ui + Tailwind CSS 4
- Three.js + React Three Fiber（3D 渲染）

基础设施
- Docker Compose
- Alembic 数据库迁移
- Traefik 反向代理

## 功能特性

Forge 知识树
- 层级文件夹结构，支持无限嵌套的 Markdown 笔记
- 每条笔记保存时异步生成 pgvector 向量嵌入
- `[[标题]]` 双向 Wikilink 引用与反向链接（Backlinks）
- 基于向量相似度的关联笔记推荐

Markdown 编辑器
- 支持 GitHub Flavored Markdown (GFM)
- 数学公式渲染（KaTeX）
- 代码语法高亮
- AI 流式文本续写与补全

3D 模型查看器
- 直接在笔记中上传 glTF/GLB 文件（支持多文件：.gltf + .bin + 贴图）
- iframe 沙盒隔离渲染，postMessage 跨域通信
- 径向菜单（7 项快捷操作）
- AI 自动优化视角（基于截图分析推荐最佳相机角度）
- AI 智能光照优化（含截图反馈迭代调整）
- AI 模型标注（视觉 AI 分析截图，生成标签与描述）
- 模型截图缩略图自动生成，视角配置持久化

知识地图
- 基于 UMAP 降维 + KDE 密度的 3D 地形可视化
- KMeans 聚类 + AI 自动生成聚类主题标签
- 星空视图：以行星轨道形式展示笔记节点

导入 / 导出
- 导入：将外部文档自动转换为 Markdown 笔记，支持 pdf、docx、pptx、xlsx、xls、html、csv、json、xml、epub、txt、md
- 导出：将笔记导出为 md、txt、html、docx、pdf

AI 工作流
- 基于 LangGraph 的笔记自动总结
- 智能大纲生成与梳理
- 跨文档知识整合报告

社区（Community）
- 将笔记发布到公开社区 Feed（含缩略图）
- 收藏、关注其他用户
- 基于 pgvector 的社区内容语义搜索

仪表盘
- 用户进化系统（Hadean → Archean → Phanerozoic 三阶段）
- 任务管理：Kanban 看板、周计划、能量值
- 活动热力图（90 天）与 30 天趋势折线
- 影响力日志（Impact Log）记录与评分

用户管理
- 管理员面板与超级用户权限控制
- 完整的用户认证与授权体系
- 头像上传与管理（支持 JPEG/PNG/GIF/WebP，最大 5MB）

邮件服务
- 密码找回功能
- 本地开发使用 Mailcatcher 拦截测试邮件

## 快速开始

### 前置条件

- 安装 Docker 和 Docker Compose
- 复制环境配置文件并填写必要参数

```
cp .env.example .env
# 编辑 .env，至少设置以下三项
```

生成安全密钥：

```
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

需要设置的关键变量：

| 变量 | 说明 |
|---|---|
| `SECRET_KEY` | JWT 签名密钥 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `FIRST_SUPERUSER_PASSWORD` | 初始超级用户密码 |

### 🐋 Docker 启动（推荐）

```
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

```
uv sync
alembic upgrade head
fastapi dev app/main.py
```

**前端**（在 `/frontend` 目录下）：

```
bun install
bun run dev
```

## 🧑‍💻 开发指南

### 后端

```
pytest                                               # 运行全部测试
pytest tests/api/routes/test_forge.py               # 运行单个测试文件
alembic revision --autogenerate -m "描述"           # 生成数据库迁移
alembic upgrade head                                 # 应用迁移
```

### 前端

```
bun run build          # TypeScript 检查 + 打包
bun run lint           # Biome 格式化与 lint
bun run test           # Playwright E2E 测试
```

### ⚠️ 修改后端接口后必做

每次修改后端路由或模型后，需重新生成前端 API 客户端：

```
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
│       │   ├── Forge/      # 笔记编辑器、3D 渲染器、径向菜单、AI 对话框
│       │   ├── Community/  # 社区 Feed、帖子卡片
│       │   └── Dashboard/  # 仪表盘、看板、热力图、进化系统
│       ├── client/         # 自动生成的 OpenAPI 客户端（勿手动编辑）
│       └── hooks/          # useAuth 等共享 Hook
└── scripts/                # generate-client.sh、test.sh
```

## 🗄 数据模型

```
User 1:N Forge          （Forge.parent_id 自引用，构成树形层级）
User 1:N Item
User 1:N DashboardTask
User 1:N DashboardLog
User 1:N UserEvolution  （进化阶段与进度）
User 1:N CommunityPost  （发布到社区的笔记）
User M:N CommunityPost  （PostFavorite 收藏关系）
User M:N User           （UserFollow 关注关系）
```

每个 `Forge` 节点在保存时异步计算并存储 pgvector 向量嵌入；`CommunityPost` 同样存储向量，用于社区内容语义搜索。

## 🚢 部署

生产环境部署（Traefik + 自动 HTTPS）请参考 [deployment.md](./deployment.md)。

## 📄 许可证

MIT
