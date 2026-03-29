# 🦜 Parrot Platform 开发者指南

本文档全面梳理了本项目（Parrot Platform）的系统架构、开发流、数据库操作规范以及生产环境的部署与维护指南。这是参与本项目的核心向导。

---

## 1. 架构概览 (Architecture)

本项目是一个激进且极度轻量化的“双工作空间” (Monorepo) 全栈单体应用，彻底拥抱了最新的底层基础设施：

- **前端 (Frontend)**: `React 19` + `Rsbuild`。抛弃了沉重的 Webpack，利用 Rspack 的底层 Rust 能力实现极速编译。核心 JS 包通过 jsDelivr CDN 挂载，大幅减轻主包体积。开发时支持热构建，生产时完全转化为纯净的静态文件。
- **后端 (Backend)**: `Bun` + `Hono`。完全摒弃 Node.js。借助 Bun 原生内置的 Web Server、原生支持的 `.env` 以及 C++ 编写的极致性能 原生 SQL 驱动 (`Bun.sql`)，无须任何 ORM（如 drizzle/prisma）带来的性能与心智开销。
- **持久层 (Database)**: `MySQL 8.4` 提供硬核存储。
- **网关层 (Proxy)**: `Nginx`，承担静态资源分发（开启了全局 Gzip 压缩）和 API 反向代理。
- **编排层 (Orchestration)**: `Docker Compose` 与 `Makefile`。所有的运维、打包、部署命令甚至回滚，统一封装进 Makefile，不需要引入重型 CI/CD 也能做到极优雅的上云操作。

---

## 2. 本地开发 (Development)

所有的开发所需依赖项都封装在 Docker 中。你只需要安装了 `Docker Desktop` 即可：

### 启动全栈
在项目根目录运行：
```bash
make up
```
这会：
1. 构建前端静态资源到 `apps/frontend/dist`
2. 检查或同步所需的阿里云源/官方源基础依赖镜像 (已支持双架构 `arm64/amd64`)
3. 按照 `mysql` -> `backend` -> `nginx` 的严格健康度探测顺序启动集群
4. **Nginx 会代理在 `http://localhost:26033`**。开发阶段，所有请求都应该从此端口进入。

### 自动化开发流
本地的 `docker-compose.yml` 内置了一个特制的 `watcher` 容器。
- **修改前端 (JSX/TSX)**：你只管保存文件，`watcher` 会在 0.3 秒内静默刷新 `dist` 文件夹，你**直接在浏览器刷新 `http://localhost:26033`** 即可看到最新效果，**不需要在终端运行任何多余的前端命令**。
- **修改后端 (Hono/DB)**：修改后端代码后，直接运行 `make restart`。由于我们极大优化了 Healthcheck，后端的重启与可用仅需几秒钟。

---

## 3. 数据库操作与迁移 (Database & Migrations)

由于我们去除了厚重的 ORM 层，我们构建了一套带智能 Tokenizer 解析和数据库层面事务回滚的工业级 Migration Runtime。

### 如何调整表结构？
永远不要直接去修改现有的表。在 `apps/backend/migrations/` 目录下新增一个以时间/序号前缀命名的 `.sql` 文件，例如：
`apps/backend/migrations/0002_add_user_profile.sql`

在 `.sql` 内，你可以使用纯正的 SQL：
```sql
CREATE TABLE user_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bio TEXT
);
```
**它是如何执行的？**
每次你触发 `make up` 或者 `make restart`，后端应用启动前的瞬间，就会**自动**触发 `bun src/db/migrate.ts`。
- 它会在 `schema_migrations` 表里记录已执行文件。
- 新增的 `.sql` 将被原子化事务 (Transaction) 保护执行，**如果你的某行 SQL 写错报错了，当前文件内的所有进度都会集体回滚**，绝不会产出脏数据。

---

## 4. 构建与部署 (Deployment)

我们在底层完成了本地芯片和远端服务器双体系隔离打通。本地基于 Mac (ARM64)，远端基于 Linux (AMD64)。

### 1. 发布到服务器
确保你的仓库没有任何未提交的代码修改（最好处于一个稳定的状态）。
```bash
make remote-deploy
```
**这个流程发生了什么？**
1. 构建前端生产级资源 (`make build`)。
2. 构建远端可运行的 AMD64 后端 Docker 镜像，并推送至阿里云镜像仓库 (`make push`)。
3. 通过 SSH 协议把 `.env` 和 `docker-compose.deploy.yml` 拷贝到目标云主机的 `deploy/parrot/` 目录 (`make remote-sync`)。
4. 登录到远端服务器，拉取最新镜像，在不停机的情况下重启服务（使用 `--no-deps` 单独更新并热启动）。

### 2. 远端日志与维护
部署后如果有任何异常，可以直接查阅远端容器日志：
```bash
make remote-logs
```

---

## 5. 项目维护与极速容灾 (Maintenance & Rollback)

项目的健壮性设计赋予了极速抢救的能力。

### 回滚 (Rollback)
如果刚运行完 `make remote-deploy` 发现生产线上新代码有严重 Bug，不需要重新本地构建编译。服务器上的 `Makefile` 保存了“上一次环境”，直接用你本地的一行命令即可将其平滑还原为上一秒存货态：
```bash
make remote-rollback
```

### 数据备份 (Database Backup)
定时抓取当前生产库的全量冷备数据到本地或备份服，无需登录数据库写指令：
```bash
make remote-db-backup
```
数据库快照会存放在服务器的 `backups/mysql` 中。当需要紧急恢复时（请准备好 `file.sql.gz` 文件）：
```bash
make remote-db-restore BACKUP_FILE=backups/mysql/你的快照文件名.sql.gz
```

---

## 开发哲学 (Code Philosophy)
1. **简单之美**：项目摒弃了重度框架组合（如 Next.js/Nest.js）。利用原生的 Web 标准解决复杂性。
2. **错误前置**：Hono 提供了一个兜底的全局 `app.onError`。除非明确的业务逻辑错报，接口级别里应尽量免去冗长的 `try/catch` 泥潭，全部 throw 出去由网关统一处理为 500 标准 JSON 结构返回。
3. **零运行耗损**：任何可以通过架构化解决的问题都不占用代码 CPU（例如把 `gzip` 丢给 Nginx，把基础依赖甩给外脑 CDN，把慢 SQL 转给引擎优化器）。
