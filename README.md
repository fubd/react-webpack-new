# 🦜 Parrot Platform 开发者指南

本文档全面梳理了本项目（Parrot Platform）的系统架构、开发流、数据库操作规范以及生产环境的部署与维护指南。这是参与本项目的核心向导。

---

## 1. 架构概览 (Architecture)

本项目是一个激进且极度轻量化的“双工作空间” (Monorepo) 全栈单体应用，彻底拥抱了最新的底层基础设施：

- **前端 (Frontend)**: `React 19` + `Rsbuild`。抛弃了沉重的 Webpack，利用 Rspack 的底层 Rust 能力实现极速编译。核心 JS 包通过 jsDelivr CDN 挂载，大幅减轻主包体积。开发时支持热构建，生产时完全转化为纯净的静态文件。
- **后端 (Backend)**: `Bun` + `Hono`。完全摒弃 Node.js。借助 Bun 原生内置的 Web Server、原生支持的 `.env` 以及 C++ 编写的极致性能 原生 SQL 驱动 (`Bun.sql`)，无须任何 ORM（如 drizzle/prisma）带来的性能与心智开销。
- **持久层 (Database)**: `MySQL 8.4` 提供硬核存储。
- **网关层 (Proxy)**: `Nginx`，承担静态资源分发（开启了全局 Gzip 压缩）和 API 反向代理。
- **目录结构与工作空间 (Workspace)**: 基于 `npm workspace` 构建统一的单体代码库 (Monorepo)。核心业务逻辑严密区分并在各自的目录中自治：
  - `apps/frontend/`: 前端独立应用目录。
  - `apps/backend/`: 后端微服务目录。
  - 此设计下，前后端共享根目录顶级的 `package.json` 统一管理依赖图谱，并在未来天然支持跨端接口类型 (Types) 直接 `import` 导入，消除端与端之间的壁垒。
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

### 数据库持久化与安全避坑 (Data Voluming & Pitfalls)

我们的系统使用 Docker **命名卷 (Named Volume)** 作为 MySQL 的底层存储。在 `docker-compose.yml` 中被标记为 `mysql-data`。

1. **为什么叫 `mysql-data`？会跟别的项目冲突吗？**
   在 Docker 的底层命名空间机制下，由于我们顶层申明了 `name: parrot`，这个卷真正在宿主机里创建时的名字叫作 **`parrot_mysql-data`**。它天然自带了项目名的前缀隔离，绝对不会和其他项目互相覆盖跑偏。这正是短名字优雅而不随意的体现。
2. **⚠️ 极高危：删除了体积卷会导致永久丢失数据**
   平时用 `docker compose down` 关停服务是安全的。但**绝对不能手滑加上 `-v` 参数**（即 `docker compose down -v`）。一旦执行，Docker 会毫不留情地连同 `parrot_mysql-data` 一起抹除，所有文章和用户数据会灰飞烟灭。
3. **⚠️ 中危：服务器整体搬迁盲区**
   由于你的数据根本不在代码文件夹内，而是被 Docker 引擎深度隐藏在 `/var/lib/docker/volumes/` 系统级底层目录下。因此如果你换服务器，仅仅把项目代码整个拷走，新服务器启动依旧会是一个“零数据”空壳。你必须使用如下的冷备功能来导出数据搬迁。

### 数据库备份与恢复 (Database Backup & Restore)

为了防御以上随时可能发生的灾难场景（手滑删除、换服务器等），我们内置了全量数据库快照工具：

**主动备份数据：**
在需要做大动作前，运行这个指令抓取当前生产库的全量冷备数据（无需登录进数据库敲长串的 `mysqldump` 指令）：
```bash
make remote-db-backup
```
数据库快照会**自动下载**并存放在目标服务器和你本地的 `backups/mysql/` 中。只要这个 `*.sql.gz` 文件捏在手里，就算服务器炸废了都可以原地秒复活。

**如何紧急恢复或搬家还原？**
（请准备好刚才那个 `xxxxx.sql.gz` 文件放在目录里）：
```bash
make remote-db-restore BACKUP_FILE=backups/mysql/你的快照文件名.sql.gz
```
运行后，当前环境的数据库将无缝覆盖回滚到你快照产生的那一刻。

---

## 开发哲学 (Code Philosophy)
1. **简单之美**：项目摒弃了重度框架组合（如 Next.js/Nest.js）。利用原生的 Web 标准解决复杂性。
2. **错误前置**：Hono 提供了一个兜底的全局 `app.onError`。除非明确的业务逻辑错报，接口级别里应尽量免去冗长的 `try/catch` 泥潭，全部 throw 出去由网关统一处理为 500 标准 JSON 结构返回。
3. **零运行耗损**：任何可以通过架构化解决的问题都不占用代码 CPU（例如把 `gzip` 丢给 Nginx，把基础依赖甩给外脑 CDN，把慢 SQL 转给引擎优化器）。

---

## 秘钥与凭证管理 (Secret Management)

整个项目的所有敏感配置（数据库访问密码等、生产服务器 SSH 到 Aliyun Registry 的密钥对等）统一定义在隐藏的 `.env` 中。

⚠️ **绝对禁止将任何 `.env` 文件提交到 Git 代码库记录中！** 
这些文件已经在 `.gitignore` 里被屏蔽。将其推到公开或即便私有的代码库，都会导致高危的云安全事件。

**那么，不能传代码库，万一本地电脑坏了丢失了怎么办？**
为了防范密码和配置丢失风险，你必须借用**第三方安全外脑**来托管你的环境文件内容：
1. **密码管理器 (首推)**：将 `.env` 里的文本全选复制，创建一个属于你个人的 `1Password` 或 `Bitwarden` 的机密笔记 (Secure Note)，同步在你的云端金库。这是最轻量、最防弹且永不丢失的做法。
2. **云服务管理控制台**：如果团队规模稍大，应当把它们托付给专业的 `HashiCorp Vault` 或阿里云/AWS 的 `Secrets Manager` (凭据服务) 中。
3. **CI/CD 保管**：如果是全自动化流水线开发，应当把各组变量拆分成一条条的 Key-Value，存放在代码托管平台的“GitHub Actions / GitLab Secret Settings”机密配置墙后面。
