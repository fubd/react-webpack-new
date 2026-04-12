# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Parrot is a full-stack monorepo: Bun + Hono backend, React 19 + Ant Design 6 frontend, MySQL 8.4, Nginx gateway. All operations go through `make` targets. The host machine requires only Docker and make — no Node.js or Bun needed.

## Common Commands

```bash
make up                  # Install deps, build frontend, build images, migrate DB, start stack + watcher
make down                # Stop watcher and Docker stack
make restart             # Recreate backend + nginx containers, restart watcher
make install             # bun install inside Docker dev container
make lint                # ESLint (both apps) inside Docker
make type-check          # tsc --noEmit (both apps) inside Docker
make frontend-build      # Build frontend assets inside Docker
make logs                # Tail all container logs
make ps                  # Show container status
```

Frontend watcher (runs in Docker container `parrot-watch`, uses polling for macOS compatibility):
```bash
make start-watch         # Start background watcher
make stop-watch          # Stop watcher
make watch               # Foreground watcher
```

Database:
```bash
make create-migration NAME=add_users_table   # Auto-numbered SQL migration file
make migrate                                  # Run migrations (alias for compose-migrate)
make compose-migrate                          # Run migrations in backend container
make db-backup                                # Backup to backups/mysql/
make db-restore BACKUP_FILE=backups/mysql/parrot_20260101_030000.sql.gz
```

## Architecture

**Request flow:** Browser → Nginx (:26033) → `/api/*` proxied to Hono backend (:26031) → MySQL (:26032). All other routes serve the React SPA from `apps/frontend/dist/`.

**Monorepo structure:** Bun workspaces — root `package.json` defines `"workspaces": ["apps/*"]`. Scripts use `bun run --filter <workspace> <script>`. `apps/backend/` and `apps/frontend/` each have their own `package.json`, `tsconfig.json`, and source tree. Shared TypeScript config in `tsconfig.base.json`.

**Backend** (`apps/backend/src/`):
- `index.ts` — All routes, middleware (CORS, logging, error handler), graceful shutdown. Routes use `Bun.sql` tagged template literals for raw SQL queries — no ORM.
- `env.ts` — Validates required env vars at startup, exports typed `env` object.
- `db/client.ts` — `Bun.sql` connection pool with `waitForDatabase()` retry loop.
- `db/migrate.ts` — Custom migration runner: `GET_LOCK` for concurrency, `schema_migrations` table for idempotency, one transaction per file for atomicity. Parses SQL statements respecting strings and comments.

**Frontend** (`apps/frontend/src/`):
- Rsbuild (Rspack) with `pluginReact` and `pluginLess`.
- React, react-dom, react-dom/client are CDN externals (UMD bundles from `s.fubodong.com`).
- Routes defined in `routes/config.tsx` with `React.lazy()` and a 404 catch-all.
- CSS Modules (`.module.less`) for all component styles.
- `components/ErrorBoundary.tsx` catches lazy-load chunk failures.

**API convention:** All `/api/*` endpoints use POST method. Only `/healthz` uses GET (consumed by Docker healthcheck and nginx).

**Docker setup:**
- `docker-compose.yml` — Local dev: backend (bun), mysql, nginx, dev (`oven/bun:1-alpine` for builds/lint/type-check). Nginx mounts host `./apps/frontend/dist` for hot reload from watcher.
- `docker-compose.deploy.yml` — Production: same services minus dev container and build contexts. Nginx image just copies pre-built frontend assets (no bun needed in nginx image). Frontend is built natively before `docker buildx`, avoiding slow cross-platform installs.
- `dev` service: `DOCKER_DEV=1` env var enables rspack polling (`watchOptions.poll: 1000`) for file watching inside Docker on macOS.

**Backend dev hot reload:** The backend container runs with `bun --watch` and mounts `apps/backend/src/` and `apps/backend/migrations/` as volumes. On Linux (CI/CD, remote servers), file changes trigger automatic process restart. On macOS Docker, VirtioFS does not propagate file system events to inotify, so `--watch` is inactive — use `make restart` instead.

**Base images** are synced to Aliyun ACR via `make ensure-base-images`. Production builds target `linux/amd64`.

## Key Conventions

- **Package manager:** Bun everywhere — `bun install`, `bun run`, `bun.lock`. No npm or Node.js.
- **Migrations:** Only add new files in `apps/backend/migrations/` with `NNNN_description.sql` naming. Never modify existing migration files. Use `make create-migration NAME=...` to get auto-numbered files.
- **SQL:** Raw SQL via `Bun.sql` tagged templates, no query builders or ORMs. Type results with inline `TypeRow[]` generics.
- **Environment variables:** Backend reads from `process.env` via `env.ts` with validation and defaults. Inside Docker, `DATABASE_HOST` is overridden to `mysql`. All secrets live in `.env` (gitignored).
- **Makefile `$(DEV_RUN)`:** Expands to `docker compose --env-file .env -f docker-compose.yml run --rm dev`. All bun-based commands (install, build, lint, type-check) use this.
- **Backend changes require image rebuild:** Backend code is copied into the Docker image at build time. After modifying `apps/backend/src/`, run `make compose-build` then `make restart` (or just `make up`).
