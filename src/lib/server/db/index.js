// Re-export the existing database layer — no rewriting needed
export { getPool, closePool } from '../../../api/db/pool.js';
export { runQuery, runSingleQuery, paginateQuery } from '../../../api/db/query.js';
export { getPgConfig, isPgConfigured, getPgConfigStatus } from '../../../api/db/config.js';
export * from '../../../api/db/repositories.js';
