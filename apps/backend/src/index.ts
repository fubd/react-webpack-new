import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { db, closeDatabase, waitForDatabase } from './db/client.js';
import { migrateDatabase } from './db/migrate.js';
import { env } from './env.js';

type SummaryRow = {
  publishedNewsCount: number;
  latestPublishedAt: string | null;
};

type NewsRow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
};

const app = new Hono();

app.use('*', logger());

app.onError((err, context) => {
  console.error('[backend] ❌ unhandled error:', err);
  return context.json(
    {
      status: 'error',
      message: err instanceof Error ? err.message : 'Internal Server Error',
    },
    500
  );
});

app.use('/api/*', cors({ origin: '*' }));

app.get('/healthz', async (context) => {
  await db`SELECT 1 AS ok`;
  return context.json({
    status: 'ok',
    service: 'backend',
    database: 'connected',
  });
});

app.get('/api/health', async (context) => {
  await db`SELECT 1 AS ok`;
  return context.json({
    status: 'ok',
    database: 'connected',
    version: env.version,
  });
});

app.get('/api/v1/system/summary', async (context) => {
  const [summary] = await db<SummaryRow[]>`
    SELECT
      COUNT(*) AS publishedNewsCount,
      DATE_FORMAT(MAX(published_at), '%Y-%m-%d %H:%i:%s') AS latestPublishedAt
    FROM news_posts
    WHERE is_published = 1
  `;

  return context.json({
    appName: env.appName,
    version: env.version,
    environment: env.nodeEnv,
    publishedNewsCount: Number(summary?.publishedNewsCount ?? 0),
    latestPublishedAt: summary?.latestPublishedAt ?? null,
    services: [
      'React 19 + Rsbuild',
      'Hono + Bun',
      'Bun.sql (MySQL)',
      'Nginx + Docker Compose',
    ],
  });
});

app.get('/api/v1/news', async (context) => {
  const rows = await db<NewsRow[]>`
    SELECT
      id,
      slug,
      title,
      summary,
      body,
      DATE_FORMAT(published_at, '%Y-%m-%d') AS publishedAt
    FROM news_posts
    WHERE is_published = 1
    ORDER BY published_at DESC, id DESC
  `;

  return context.json({
    items: rows.map((row) => ({
      id: Number(row.id),
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: row.body,
      publishedAt: row.publishedAt,
    })),
  });
});

app.get('/api/v1/meta', (context) => {
  return context.json({
    appName: env.appName,
    version: env.version,
    ports: {
      frontend: Number(process.env.FRONTEND_PORT ?? 26030),
      backend: Number(process.env.BACKEND_PORT ?? 26031),
      mysql: Number(process.env.MYSQL_PORT ?? 26032),
      nginx: Number(process.env.NGINX_PORT ?? 26033),
    },
  });
});

const shutdown = async (signal: string) => {
  console.log(`[backend] received ${signal}, shutting down`);
  server.stop(true);
  await closeDatabase();
  process.exit(0);
};

await waitForDatabase();
await migrateDatabase();

const server = Bun.serve({
  fetch: app.fetch,
  port: env.port,
  hostname: '0.0.0.0',
});

console.log(`[backend] listening on http://localhost:${server.port}`);

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
