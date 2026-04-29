const DEFAULT_PORT = 5432;

const parseNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const getPgConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.PG_HOST || 'localhost',
    port: parseNumber(process.env.PG_PORT, DEFAULT_PORT),
    database: process.env.PG_DATABASE || '',
    user: process.env.PG_USER || '',
    password: process.env.PG_PASSWORD || '',
    max: parseNumber(process.env.PG_POOL_MAX, 10),
    idleTimeoutMillis: parseNumber(process.env.PG_POOL_IDLE_TIMEOUT_MS, 30000)
  };
};

export const isPgConfigured = () => {
  if (process.env.DATABASE_URL) {
    return true;
  }

  const config = getPgConfig();
  return Boolean(config.database && config.user && config.password);
};

export const getPgConfigStatus = () => {
  if (process.env.DATABASE_URL) {
    return {
      configured: true,
      connectionString: '***',
      provider: 'postgresql'
    };
  }

  const config = getPgConfig();
  return {
    configured: isPgConfigured(),
    host: config.host || null,
    database: config.database || null,
    port: config.port,
    provider: 'postgresql'
  };
};
