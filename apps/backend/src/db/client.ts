import {env} from '../env.js';

const url = `mysql://${encodeURIComponent(env.databaseUser)}:${encodeURIComponent(env.databasePassword)}@${env.databaseHost}:${env.databasePort}/${env.databaseName}`;

export const db = new Bun.SQL(url);

export const pingDatabase = async () => {
  await db`SELECT 1 AS ok`;
};

export const waitForDatabase = async (attempts = 20, delayMs = 2_000) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pingDatabase();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await Bun.sleep(delayMs);
    }
  }
};

export const closeDatabase = async () => {
  await db.close();
};
