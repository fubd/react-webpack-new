import {serve} from '@hono/node-server';
import {sql} from 'drizzle-orm';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {closeDatabase, getRows, pingDatabase} from './db/client.js';
import {migrateDatabase} from './db/migrate.js';
import {env} from './env.js';

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

app.use('/api/*', cors({origin: '*'}));

app.get('/healthz', async (context) => {
  try {
    await pingDatabase();

    return context.json({
      status: 'ok',
      service: 'backend',
      database: 'connected',
    });
  } catch (error) {
    return context.json({
      status: 'error',
      service: 'backend',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }, 500);
  }
});

app.get('/api/health', async (context) => {
  try {
    await pingDatabase();

    return context.json({
      status: 'ok',
      database: 'connected',
      version: env.version,
    });
  } catch (error) {
    return context.json({
      status: 'error',
      database: 'disconnected',
      version: env.version,
      message: error instanceof Error ? error.message : 'Unknown database error',
    }, 500);
  }
});

app.get('/api/v1/system/summary', async (context) => {
  const [summary] = await getRows<SummaryRow>(sql`
    SELECT
      COUNT(*) AS publishedNewsCount,
      DATE_FORMAT(MAX(published_at), '%Y-%m-%d %H:%i:%s') AS latestPublishedAt
    FROM news_posts
    WHERE is_published = 1
  `);

  return context.json({
    appName: env.appName,
    version: env.version,
    environment: env.nodeEnv,
    publishedNewsCount: Number(summary?.publishedNewsCount ?? 0),
    latestPublishedAt: summary?.latestPublishedAt ?? null,
    services: [
      'React 19 + Webpack',
      'Hono + TypeScript',
      'Drizzle raw SQL + MySQL',
      'Nginx + Docker Compose',
    ],
  });
});

app.get('/api/v1/news', async (context) => {
  const rows = await getRows<NewsRow>(sql`
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
  `);

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

const waitForDatabase = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pingDatabase();
      return;
    } catch (error) {
      if (attempt === 20) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 2_000);
      });
    }
  }
};

const shutdown = async (signal: string) => {
  console.log(`[backend] received ${signal}, shutting down`);
  await closeDatabase();
  process.exit(0);
};

const startServer = async () => {
  await waitForDatabase();
  await migrateDatabase();

  serve(
    {
      fetch: app.fetch,
      port: env.port,
      hostname: '0.0.0.0',
    },
    (info) => {
      console.log(`[backend] listening on http://localhost:${info.port}`);
    },
  );
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

startServer().catch(async (error: unknown) => {
  console.error('[backend] failed to start');
  console.error(error);
  await closeDatabase();
  process.exit(1);
});
