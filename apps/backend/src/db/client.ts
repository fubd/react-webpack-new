import mysql from 'mysql2/promise';
import {drizzle} from 'drizzle-orm/mysql2';
import {sql, type SQL} from 'drizzle-orm';
import {env} from '../env.js';

export const pool = mysql.createPool({
  host: env.databaseHost,
  port: env.databasePort,
  user: env.databaseUser,
  password: env.databasePassword,
  database: env.databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60_000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  timezone: 'Z',
});

export const db = drizzle(pool);

const normalizeRows = <Row extends Record<string, unknown>>(result: unknown) => {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Row[];
  }

  if (Array.isArray(result)) {
    return result as Row[];
  }

  if (
    result
    && typeof result === 'object'
    && 'rows' in result
    && Array.isArray(result.rows)
  ) {
    return result.rows as Row[];
  }

  return [] as Row[];
};

export const getRows = async <Row extends Record<string, unknown>>(statement: SQL) => {
  const result = await db.execute(statement);

  return normalizeRows<Row>(result);
};

export const getFirstRow = async <Row extends Record<string, unknown>>(statement: SQL) => {
  const rows = await getRows<Row>(statement);

  return rows[0] ?? null;
};

export const pingDatabase = async () => {
  await db.execute(sql`SELECT 1 AS ok`);
};

export const closeDatabase = async () => {
  await pool.end();
};
