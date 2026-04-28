import pg from 'pg';
import { getPgConfig, isPgConfigured } from './config.js';

let pool = null;

export const getPool = () => {
  if (!isPgConfigured()) {
    throw new Error('PostgreSQL is not configured. Set DATABASE_URL or PG_HOST, PG_DATABASE, PG_USER, and PG_PASSWORD.');
  }

  if (!pool) {
    pool = new pg.Pool(getPgConfig());

    pool.on('error', (error) => {
      console.error('[PG Pool] Unexpected error on idle client:', error);
    });
  }

  return pool;
};

export const closePool = async () => {
  if (!pool) {
    return;
  }

  const current = pool;
  pool = null;
  await current.end();
};
