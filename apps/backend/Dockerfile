ARG BASE_BUN_IMAGE=oven/bun:1-alpine

FROM ${BASE_BUN_IMAGE} AS runner
WORKDIR /app

ENV BUN_ENV=production
ENV PORT=26031

# Install only backend dependencies (no workspace root needed — Bun resolves standalone)
COPY apps/backend/package.json ./package.json
RUN bun install --production

COPY apps/backend/src ./src
COPY apps/backend/migrations ./migrations

EXPOSE 26031

CMD ["bun", "./src/index.ts"]
