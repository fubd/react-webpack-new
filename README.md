# Dot SaaS Full-stack Branch

This branch refactors the original frontend starter into a workspace-based stack:

- `apps/frontend`: React 19 + Webpack + React Router + Ant Design
- `apps/backend`: Hono + TypeScript + Drizzle on top of MySQL, with raw SQL-first queries
- `infra/nginx`: HTTP gateway nginx for host-nginx-to-container-nginx forwarding
- `docker-compose.yml`: frontend, backend, MySQL, and nginx wired to ports `26030-26033`
- `Makefile`: local build/run, registry push, and remote deployment helpers

## Quick start

1. Copy `.env.example` to `.env`
2. Run `make install`
3. Run `make up`

`make up` will first mirror the required base images into your Aliyun ACR namespace when they do not already exist, then build the project images from those ACR-hosted bases.

## Useful commands

- `make dev-frontend`
- `make dev-backend`
- `make type-check`
- `make build`
- `make logs`
- `make remote-deploy`
