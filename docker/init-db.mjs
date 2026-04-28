import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'src', 'db', 'migrations');

const getConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'khrental',
    user: process.env.PG_USER || 'khrental',
    password: process.env.PG_PASSWORD || ''
  };
};

const waitForDatabase = async (config, maxRetries = 20) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new pg.Client(config);
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Database not ready after ${maxRetries} attempts: ${error.message}`);
      }

      console.log(`[init-db] Waiting for database (attempt ${attempt}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

const ensureExtensions = async (client) => {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
};

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(500) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT name FROM _migrations ORDER BY name');
  return new Set(result.rows.map((row) => row.name));
};

const getMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[init-db] No migrations directory found');
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && /^2026/.test(file))
    .sort();
};

const runMigrations = async () => {
  const config = getConfig();

  console.log('[init-db] Waiting for database to be ready...');
  await waitForDatabase(config);

  const client = new pg.Client(config);
  await client.connect();

  try {
    console.log('[init-db] Ensuring extensions...');
    await ensureExtensions(client);

    console.log('[init-db] Ensuring migrations table...');
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    console.log(`[init-db] Found ${files.length} migration files, ${applied.size} already applied`);

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      console.log(`[init-db] Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        console.log(`[init-db] Applied: ${file}`);
      } catch (error) {
        console.error(`[init-db] Failed to apply ${file}:`, error.message);
        throw error;
      }
    }

    console.log('[init-db] All migrations applied successfully');
  } finally {
    await client.end();
  }
};

runMigrations().catch((error) => {
  console.error('[init-db] Fatal error:', error);
  process.exit(1);
});
