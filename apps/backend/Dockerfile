ARG BASE_BUN_IMAGE=oven/bun:1-alpine

FROM ${BASE_BUN_IMAGE} AS runner
WORKDIR /app

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
