# Dot SaaS Full-stack Branch

This branch refactors the original frontend starter into a workspace-based stack:

- `apps/frontend`: React 19 + Rsbuild + React Router + Ant Design
- `apps/backend`: Hono + TypeScript + Drizzle on top of MySQL, with raw SQL-first queries
- `infra/nginx`: nginx serves frontend static assets and proxies API traffic to the backend
- `docker-compose.yml`: backend, MySQL, and nginx wired to ports `26031-26033`
- `Makefile`: local build/run, explicit database migration, MySQL backup and restore, registry push, and remote deployment helpers

## Quick start

1. Copy `.env.example` to `.env`
2. Copy `.env.deploy.example` to `.env.deploy` if you plan to push images or deploy remotely
3. Run `make install`
4. Run `make up`

`.env` is the stack/runtime file that gets synced to the server. `.env.deploy` stays local and only holds deployment credentials and remote host settings.

`make up` first builds the frontend static bundle for nginx to serve, then mirrors the required base images into your Aliyun ACR namespace, builds the project images from those ACR-hosted bases, runs SQL migrations in a one-off backend container, and finally starts the long-running services.

## Useful commands

- `make frontend-build`
- `make dev-backend`
- `make type-check`
- `make build`
- `make logs`
- `make compose-migrate`
- `make db-backup`
- `make db-restore BACKUP_FILE=backups/mysql/parrot_20260325_120000.sql.gz`
- `make remote-deploy`
- `make remote-verify`
- `make remote-rollback`
- `make remote-db-backup`
- `make remote-db-restore BACKUP_FILE=backups/mysql/parrot_20260325_120000.sql.gz`

## Config split

- `.env` contains stack/runtime values such as ports, database settings, image namespace, registry domain, and the default `VERSION`
- `.env.deploy` contains deployment-only secrets such as `ALIYUN_USERNAME`, `ALIYUN_PASSWORD`, `REMOTE_HOST`, and `REMOTE_PATH`
- Remote deployment only syncs `.env`, so registry credentials stay on your machine

## Migration flow

- The backend server no longer auto-runs migrations on boot
- `make compose-migrate` runs migrations in a one-off backend container
- `make up` and `make remote-deploy` both run migrations explicitly before starting or updating the API service

## Frontend workflow

- Local frontend changes are built with `make frontend-build` or `npm run build:frontend`
- nginx serves the generated `apps/frontend/dist` assets on `NGINX_PORT`
- There is no local frontend dev server flow anymore; refresh the nginx page after rebuilding

## MySQL backup and restore

- `make db-backup` writes a compressed SQL dump to `backups/mysql/`
- `make db-restore BACKUP_FILE=...` restores a local dump into the running MySQL service
- `make remote-db-backup` creates a compressed SQL dump on the remote host under `$(REMOTE_PATH)/backups/mysql/`
- `make remote-db-restore BACKUP_FILE=...` restores a remote dump file back into the deployed MySQL service

## Remote verification and rollback

- `make remote-deploy` now runs a remote health verification step after deployment
- If verification fails, it automatically attempts `make remote-rollback`
- Rollback uses the previous remote `VERSION` metadata, so it is most useful when you deploy versioned tags rather than always using `latest`
