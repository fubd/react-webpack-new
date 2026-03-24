import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sql} from 'drizzle-orm';
import {db, getFirstRow, pool, closeDatabase} from './client.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, '../../migrations');

export const migrateDatabase = async () => {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of migrationFiles) {
    const appliedMigration = await getFirstRow<{name: string}>(sql`
      SELECT name
      FROM schema_migrations
      WHERE name = ${fileName}
      LIMIT 1
    `);

    if (appliedMigration) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, fileName);
    const migrationSql = await readFile(migrationPath, 'utf8');

    await pool.query(migrationSql);

    await db.execute(sql`
      INSERT INTO schema_migrations (name)
      VALUES (${fileName})
    `);
  }
};

const shouldRunAsScript = process.argv[1] ? path.resolve(process.argv[1]) === currentFile : false;

if (shouldRunAsScript) {
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
