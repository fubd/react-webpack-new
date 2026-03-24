ARG BASE_NODE_IMAGE=registry.cn-hangzhou.aliyuncs.com/1997f16cd/parrot-base-node:22-alpine

FROM ${BASE_NODE_IMAGE} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN npm ci --workspaces --include-workspace-root

FROM deps AS builder
WORKDIR /app

COPY . .

RUN npm run build --workspace @parrot/backend

FROM ${BASE_NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=26031
ENV NODE_OPTIONS=--max-old-space-size=256

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN npm ci --omit=dev --workspace @parrot/backend --include-workspace-root=false

COPY --from=builder /app/apps/backend/dist /app/apps/backend/dist
COPY --from=builder /app/apps/backend/migrations /app/apps/backend/migrations

EXPOSE 26031

CMD ["npm", "run", "start", "--workspace", "@parrot/backend"]
