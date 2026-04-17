import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db, closeDatabase, waitForDatabase} from './client.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, '../../migrations');
const migrationLockName = 'parrot_schema_migrations';

type LockRow = {acquired: number | null};
type MigrationRow = {name: string};
type SqlTransaction = {
  unsafe: (statement: string) => Promise<unknown>;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};
type TransactionCapableDb = Partial<{
  begin: (callback: (tx: SqlTransaction) => Promise<void>) => Promise<void>;
  transaction: (callback: (tx: SqlTransaction) => Promise<void>) => Promise<void>;
}>;

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let inBlockComment = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // If currently inside a block comment (/* ... */)
    if (inBlockComment) {
      currentStatement += char;
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        currentStatement += nextChar;
        i++;
      }
      continue;
    }

    // If currently inside a line comment (-- ...)
    if (inLineComment) {
      currentStatement += char;
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    // If currently inside a string literal ('...', "...", `...`)
    if (inString) {
      currentStatement += char;
      if (char === '\\') {
        currentStatement += nextChar; // Handle escaping
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    // Start of a block comment
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      currentStatement += char + nextChar;
      i++;
      continue;
    }

    // Start of a line comment
    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      currentStatement += char + nextChar;
      i++;
      continue;
    }

    // Start of a string literal
    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringChar = char;
      currentStatement += char;
      continue;
    }

    // Not inside anything, safe to split?
    if (char === ';') {
      const trimmed = currentStatement.trim();
      if (trimmed) statements.push(trimmed);
      currentStatement = '';
      continue;
    }

    currentStatement += char;
  }

  const finalTrimmed = currentStatement.trim();
  if (finalTrimmed) statements.push(finalTrimmed);

  return statements;
}

export const migrateDatabase = async () => {
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
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of migrationFiles) {
      const [applied] = await db<MigrationRow[]>`
        SELECT name FROM schema_migrations WHERE name = ${fileName} LIMIT 1
      `;

      if (applied) {
        continue;
      }

      console.log(`[migrate] reading: ${fileName}`);
      const migrationPath = path.join(migrationsDir, fileName);
      const migrationSql = await Bun.file(migrationPath).text();

      const statements = splitSqlStatements(migrationSql);

      try {
        const transactionalDb = db as typeof db & TransactionCapableDb;

        if (typeof transactionalDb.begin === 'function') {
          await transactionalDb.begin(async tx => {
            for (const statement of statements) {
              await tx.unsafe(statement);
            }
            await tx`INSERT INTO schema_migrations (name) VALUES (${fileName})`;
          });
        } else if (typeof transactionalDb.transaction === 'function') {
          await transactionalDb.transaction(async tx => {
            for (const statement of statements) {
              await tx.unsafe(statement);
            }
            await tx`INSERT INTO schema_migrations (name) VALUES (${fileName})`;
          });
        } else {
          // Native fallback transaction logic
          await db`START TRANSACTION`;
          try {
            for (const statement of statements) {
              await db.unsafe(statement);
            }
            await db`INSERT INTO schema_migrations (name) VALUES (${fileName})`;
            await db`COMMIT`;
          } catch (e) {
            await db`ROLLBACK`;
            throw e;
          }
        }
        console.log(`[migrate] successfully applied: ${fileName}`);
      } catch (e) {
        console.error(`[migrate] ❌ failed to apply ${fileName}:`, e);
        throw e;
      }
    }
  } catch (err) {
    console.error('[migrate] execution failed:', err);
    throw err;
  } finally {
    await db`DO RELEASE_LOCK(${migrationLockName})`;
  }
};

if (import.meta.path === Bun.main) {
  waitForDatabase()
    .then(() => migrateDatabase())
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
