ARG BASE_NODE_IMAGE=registry.cn-hangzhou.aliyuncs.com/1997f16cd/parrot-base-node:22-alpine
ARG BASE_NGINX_IMAGE=registry.cn-hangzhou.aliyuncs.com/1997f16cd/parrot-base-nginx:1.27-alpine

FROM ${BASE_NODE_IMAGE} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN npm ci --workspaces --include-workspace-root

FROM deps AS builder
WORKDIR /app

COPY . .

RUN npm run build --workspace @parrot/frontend

FROM ${BASE_NGINX_IMAGE} AS runner

COPY apps/frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 26030

CMD ["nginx", "-g", "daemon off;"]
