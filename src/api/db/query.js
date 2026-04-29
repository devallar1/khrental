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
