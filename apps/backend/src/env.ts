// Bun auto-loads .env — no dotenv import needed.

const readString = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const readNumber = (key: string, fallback: number) => {
  const rawValue = process.env[key];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${key} must be a valid number.`);
  }

  return parsedValue;
};

export const env = {
  appName: readString('APP_NAME', 'Parrot'),
  nodeEnv: readString('NODE_ENV', 'development'),
  version: readString('VERSION', 'latest'),
  port: readNumber('PORT', readNumber('BACKEND_PORT', 26031)),
  databaseHost: readString('DATABASE_HOST', '127.0.0.1'),
  databasePort: readNumber('DATABASE_PORT', 3306),
  databaseName: readString('MYSQL_DATABASE', 'parrot'),
  databaseUser: readString('MYSQL_USER', 'parrot'),
  databasePassword: readString('MYSQL_PASSWORD', 'parrot_dev_password'),
};
