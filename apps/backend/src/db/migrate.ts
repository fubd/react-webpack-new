import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDatabase, waitForDatabase } from './client.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, '../../migrations');
const migrationLockName = 'parrot_schema_migrations';

type LockRow = { acquired: number | null };
type MigrationRow = { name: string };

export const migrateDatabase = async () => {
  await waitForDatabase();

  const [lockResult] = await db<LockRow[]>`SELECT GET_LOCK(${migrationLockName}, 60) AS acquired`;

  if (Number(lockResult?.acquired ?? 0) !== 1) {
    throw new Error(`Failed to acquire migration lock: ${migrationLockName}`);
  }

  try {
    await db`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const migrationFiles = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of migrationFiles) {
      const [applied] = await db<MigrationRow[]>`
        SELECT name FROM schema_migrations WHERE name = ${fileName} LIMIT 1
      `;

      if (applied) {
        continue;
      }

      const migrationPath = path.join(migrationsDir, fileName);
      const migrationSql = await Bun.file(migrationPath).text();

      // Execute each statement individually (handles multi-statement SQL files).
      const statements = migrationSql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await db.unsafe(statement);
      }

      await db`INSERT INTO schema_migrations (name) VALUES (${fileName})`;
      console.log(`[migrate] applied: ${fileName}`);
    }
  } finally {
    await db`DO RELEASE_LOCK(${migrationLockName})`;
  }
};

// When invoked directly via `bun src/db/migrate.ts`
if (import.meta.path === Bun.main) {
  migrateDatabase()
    .then(() => {
      console.log('[backend] migrations completed');
    })
    .catch((error: unknown) => {
      console.error('[backend] migrations failed');
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDatabase();
    });
}
