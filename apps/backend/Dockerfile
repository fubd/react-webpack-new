ARG BASE_BUN_IMAGE=registry.cn-hangzhou.aliyunc.com/fubd_own/base-bun:1-alpine
ARG BUN_CONFIG_REGISTRY=https://registry.npmmirror.com

FROM ${BASE_BUN_IMAGE} AS runner
WORKDIR /app

ARG BUN_CONFIG_REGISTRY
ENV BUN_CONFIG_REGISTRY=${BUN_CONFIG_REGISTRY}

RUN apk add --no-cache wget

ENV BUN_ENV=production
ENV PORT=26031

COPY apps/backend/package.json ./package.json
RUN bun install --production

COPY apps/backend/src ./src
COPY apps/backend/migrations ./migrations

EXPOSE 26031

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:26031/healthz >/dev/null || exit 1

CMD ["bun", "./src/index.ts"]
