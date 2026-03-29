ARG BASE_NODE_IMAGE=registry.cn-hangzhou.aliyuncs.com/fubd_own/parrot-base-node:22-alpine
ARG BASE_NGINX_IMAGE=registry.cn-hangzhou.aliyuncs.com/fubd_own/parrot-base-nginx:1.27-alpine
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_FETCH_RETRIES=5
ARG NPM_FETCH_RETRY_FACTOR=2
ARG NPM_FETCH_RETRY_MINTIMEOUT=20000
ARG NPM_FETCH_RETRY_MAXTIMEOUT=120000

FROM ${BASE_NODE_IMAGE} AS builder
WORKDIR /app

ARG NPM_REGISTRY
ARG NPM_FETCH_RETRIES
ARG NPM_FETCH_RETRY_FACTOR
ARG NPM_FETCH_RETRY_MINTIMEOUT
ARG NPM_FETCH_RETRY_MAXTIMEOUT

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN npm config set registry "${NPM_REGISTRY}" \
    && npm config set fetch-retries "${NPM_FETCH_RETRIES}" \
    && npm config set fetch-retry-factor "${NPM_FETCH_RETRY_FACTOR}" \
    && npm config set fetch-retry-mintimeout "${NPM_FETCH_RETRY_MINTIMEOUT}" \
    && npm config set fetch-retry-maxtimeout "${NPM_FETCH_RETRY_MAXTIMEOUT}" \
    && npm ci --workspaces --include-workspace-root

COPY . .

RUN npm run build --workspace @parrot/frontend

FROM ${BASE_NGINX_IMAGE} AS runner

COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
