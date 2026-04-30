import { getPool } from './pool.js';

const NAMED_PARAM_REGEX = /@([A-Za-z_][A-Za-z0-9_]*)/g;

const translateNamedParams = (queryText, params = {}) => {
  const paramMap = new Map();
  const values = [];

  const text = queryText.replace(NAMED_PARAM_REGEX, (_match, name) => {
    if (paramMap.has(name)) {
      return `$${paramMap.get(name)}`;
    }

    values.push(params[name] !== undefined ? params[name] : null);
    const index = values.length;
    paramMap.set(name, index);
    return `$${index}`;
  });

  return { text, values };
};

export const runQuery = async (queryText, params = {}) => {
  const pool = getPool();
  const { text, values } = translateNamedParams(queryText, params);
  const result = await pool.query(text, values);
  return result.rows || [];
};

export const runSingleQuery = async (queryText, params = {}) => {
  const rows = await runQuery(queryText, params);
  return rows[0] || null;
};

/**
 * Run a function inside a single Postgres transaction. The callback receives
 * a `{ runQuery, runSingleQuery }` pair bound to the transaction's client, so
 * every statement inside the callback shares the same connection and is
 * committed (or rolled back) atomically.
 *
 *   await withTransaction(async ({ runQuery }) => {
 *     await runQuery(`INSERT INTO foo (...) VALUES (...)`, { ... });
 *     await runQuery(`UPDATE bar SET ... WHERE id = @id`, { id });
 *   });
 *
 * Any thrown error rolls back the transaction. The client is always released.
 */
export const withTransaction = async (fn) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      runQuery: async (queryText, params = {}) => {
        const { text, values } = translateNamedParams(queryText, params);
        const result = await client.query(text, values);
        return result.rows || [];
      },
      runSingleQuery: async (queryText, params = {}) => {
        const { text, values } = translateNamedParams(queryText, params);
        const result = await client.query(text, values);
        return (result.rows || [])[0] || null;
      }
    };
    const out = await fn(tx);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
};

export const paginateQuery = async ({
  baseQuery,
  orderBy,
  page = 1,
  pageSize = 50,
  params = {}
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.max(Number(pageSize) || 50, 1);
  const offset = (safePage - 1) * safePageSize;

  const fullQuery = `
    ${baseQuery}
    ORDER BY ${orderBy}
    LIMIT @pageSize OFFSET @offset
  `;

  return runQuery(fullQuery, { ...params, offset, pageSize: safePageSize });
};
