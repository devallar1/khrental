import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { runQuery, runSingleQuery } from '../mssql/query.js';
import { createAppUser, findAppUserByEmail, updateAppUser } from '../mssql/repositories.js';
import { isMssqlConfigured } from '../mssql/config.js';

const STORAGE_ROOT = path.resolve(process.cwd(), 'public', 'storage');
const AUTH_STORE_PATH = path.resolve(process.cwd(), '.local-auth-store.json');
const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const RELATION_CONFIG = {
  invoices: {
    properties: { table: 'properties', localKey: 'propertyid', remoteKey: 'id', type: 'one' },
    app_users: { table: 'app_users', localKey: 'renteeid', remoteKey: 'id', type: 'one' }
  },
  utility_readings: {
    properties: { table: 'properties', localKey: 'propertyid', remoteKey: 'id', type: 'one' },
    app_users: { table: 'app_users', localKey: 'renteeid', remoteKey: 'id', type: 'one' },
    invoices: { table: 'invoices', localKey: 'invoice_id', remoteKey: 'id', type: 'one' }
  },
  maintenance_requests: {
    maintenance_request_images: { table: 'maintenance_request_images', localKey: 'id', remoteKey: 'maintenance_request_id', type: 'many' },
    properties: { table: 'properties', localKey: 'propertyid', remoteKey: 'id', type: 'one' },
    app_users: { table: 'app_users', localKey: 'renteeid', remoteKey: 'id', type: 'one' }
  },
  agreements: {
    properties: { table: 'properties', localKey: 'propertyid', remoteKey: 'id', type: 'one' },
    app_users: { table: 'app_users', localKey: 'renteeid', remoteKey: 'id', type: 'one' },
    property_units: { table: 'property_units', localKey: 'unitid', remoteKey: 'id', type: 'one' },
    agreement_templates: { table: 'agreement_templates', localKey: 'templateid', remoteKey: 'id', type: 'one' }
  }
};

const ensureIdentifier = (value, label = 'identifier') => {
  if (!IDENTIFIER_REGEX.test(value || '')) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return value;
};

const splitSelect = (select = '*') => {
  const parts = [];
  let current = '';
  let depth = 0;

  for (const char of String(select)) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(depth - 1, 0);

    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseRelationSpec = (part) => {
  const colonMatch = part.match(/^([A-Za-z_][A-Za-z0-9_]*)(?::|!)([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
  if (colonMatch) {
    return {
      alias: colonMatch[1],
      localKey: colonMatch[2],
      columns: colonMatch[3] || '*'
    };
  }

  const tableMatch = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
  if (tableMatch) {
    return {
      alias: tableMatch[1],
      columns: tableMatch[2] || '*'
    };
  }

  return null;
};

const normalizeValue = (value) => {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
};

const parseDbValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (_error) {
      return value;
    }
  }

  return value;
};

const mapRow = (row) => {
  const mapped = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    mapped[key] = parseDbValue(value);
  });
  return mapped;
};

const isMssqlUnavailableError = (error) => {
  const message = String(error?.message || error || '');
  return message.includes('MSSQL is not configured');
};

const readAuthStore = async () => {
  try {
    const raw = await fs.readFile(AUTH_STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return { users: [] };
  }
};

const writeAuthStore = async (store) => {
  await fs.writeFile(AUTH_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

const hashPassword = (password) => crypto.createHash('sha256').update(String(password || '')).digest('hex');

const buildAuthUser = (record) => ({
  id: record.authId,
  email: record.email,
  role: record.role || 'authenticated',
  aud: 'authenticated',
  app_metadata: { provider: 'local', role: record.role || 'authenticated' },
  user_metadata: record.metadata || {}
});

const buildSession = (record) => ({
  access_token: crypto.randomUUID(),
  token_type: 'bearer',
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  user: buildAuthUser(record)
});

const ensureAuthRecord = async ({ email, password, role = 'authenticated', metadata = {} }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const store = await readAuthStore();
  const existing = store.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    return { store, record: existing, created: false };
  }

  const authId = `local-${crypto.randomUUID()}`;
  let appUser = await findAppUserByEmail(normalizedEmail);
  if (!appUser) {
    appUser = await createAppUser({
      email: normalizedEmail,
      auth_id: authId,
      name: metadata.name || normalizedEmail.split('@')[0],
      role,
      user_type: metadata.user_type || (role === 'rentee' ? 'rentee' : 'staff'),
      status: metadata.status || 'active',
      invited: Boolean(metadata.invited)
    });
  } else if (!appUser.auth_id) {
    appUser = await updateAppUser(appUser.id, { auth_id: authId, invited: true });
  }

  const record = {
    id: crypto.randomUUID(),
    authId,
    appUserId: appUser?.id || null,
    email: normalizedEmail,
    passwordHash: hashPassword(password || crypto.randomUUID()),
    role,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.users.push(record);
  await writeAuthStore(store);
  return { store, record, created: true };
};

const coerceFilter = (filter = {}, index = 0) => {
  const column = String(filter.column || '').trim();
  const operator = String(filter.operator || 'eq').trim().toLowerCase();
  const value = filter.value;

  if (!column) {
    throw new Error(`Missing filter column at index ${index}`);
  }

  return { column, operator, value };
};

const isSimpleColumn = (column) => IDENTIFIER_REGEX.test(column);

const buildWhereClause = (filters = []) => {
  const clauses = [];
  const params = {};
  const postFilters = [];

  filters.forEach((filter, index) => {
    const { column, operator, value } = coerceFilter(filter, index);

    if (!isSimpleColumn(column)) {
      postFilters.push({ column, operator, value });
      return;
    }

    const paramKey = `filter${index}`;

    switch (operator) {
      case 'eq':
        clauses.push(`${column} = @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'neq':
        clauses.push(`${column} <> @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'gt':
        clauses.push(`${column} > @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'gte':
        clauses.push(`${column} >= @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'lt':
        clauses.push(`${column} < @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'lte':
        clauses.push(`${column} <= @${paramKey}`);
        params[paramKey] = normalizeValue(value);
        break;
      case 'like':
      case 'ilike':
        clauses.push(`${operator === 'ilike' ? 'LOWER(' + column + ')' : column} LIKE ${operator === 'ilike' ? 'LOWER(' : ''}@${paramKey}${operator === 'ilike' ? ')' : ''}`);
        params[paramKey] = String(value || '');
        break;
      case 'in': {
        if (!Array.isArray(value) || value.length === 0) {
          clauses.push('1 = 0');
          break;
        }

        const inParams = value.map((entry, valueIndex) => {
          const itemKey = `${paramKey}_${valueIndex}`;
          params[itemKey] = normalizeValue(entry);
          return `@${itemKey}`;
        });
        clauses.push(`${column} IN (${inParams.join(', ')})`);
        break;
      }
      case 'is':
        clauses.push(value === null ? `${column} IS NULL` : `${column} = @${paramKey}`);
        if (value !== null) params[paramKey] = normalizeValue(value);
        break;
      default:
        postFilters.push({ column, operator, value });
    }
  });

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    postFilters
  };
};

const applyPostFilters = (rows, filters = []) => rows.filter((row) => {
  return filters.every(({ column, operator, value }) => {
    const pathParts = String(column).split('->').map((part) => part.trim()).filter(Boolean);
    const currentValue = pathParts.reduce((accumulator, part) => accumulator?.[part], row);

    switch (operator) {
      case 'eq':
        return currentValue === value;
      case 'neq':
        return currentValue !== value;
      case 'is':
        return value === null ? currentValue == null : currentValue === value;
      case 'like':
      case 'ilike':
        return String(currentValue || '').toLowerCase().includes(String(value || '').replace(/%/g, '').toLowerCase());
      default:
        return true;
    }
  });
});

const augmentRows = async (table, select, rows) => {
  const relationSpecs = splitSelect(select).map(parseRelationSpec).filter(Boolean);
  if (relationSpecs.length === 0 || rows.length === 0) {
    return rows;
  }

  const tableRelations = RELATION_CONFIG[table] || {};
  const augmented = rows.map((row) => ({ ...row }));

  for (const spec of relationSpecs) {
    const relation = tableRelations[spec.alias] || {
      table: spec.alias,
      localKey: spec.localKey,
      remoteKey: 'id',
      type: spec.localKey ? 'one' : 'many'
    };

    if (!relation.localKey && relation.type !== 'many') {
      continue;
    }

    const ids = [...new Set(augmented.map((row) => row[spec.localKey || relation.localKey]).filter(Boolean))];
    if (relation.type === 'one' && ids.length === 0) {
      augmented.forEach((row) => {
        row[spec.alias] = null;
      });
      continue;
    }

    const selectedColumns = splitSelect(spec.columns)
      .map((column) => column.trim())
      .filter((column) => column === '*' || IDENTIFIER_REGEX.test(column));
    const columnSql = selectedColumns.length === 0 || selectedColumns.includes('*')
      ? '*'
      : selectedColumns.join(', ');

    if (relation.type === 'many') {
      const parentIds = [...new Set(augmented.map((row) => row[relation.localKey]).filter(Boolean))];
      if (parentIds.length === 0) {
        augmented.forEach((row) => {
          row[spec.alias] = [];
        });
        continue;
      }

      const params = {};
      const placeholders = parentIds.map((id, index) => {
        const key = `rel_${spec.alias}_${index}`;
        params[key] = id;
        return `@${key}`;
      });

      const relatedRows = (await runQuery(
        `SELECT ${columnSql} FROM ${ensureIdentifier(relation.table, 'table')} WHERE ${ensureIdentifier(relation.remoteKey, 'column')} IN (${placeholders.join(', ')})`,
        params
      )).map(mapRow);

      augmented.forEach((row) => {
        row[spec.alias] = relatedRows.filter((relatedRow) => relatedRow[relation.remoteKey] === row[relation.localKey]);
      });
      continue;
    }

    const params = {};
    const placeholders = ids.map((id, index) => {
      const key = `rel_${spec.alias}_${index}`;
      params[key] = id;
      return `@${key}`;
    });

    const relatedRows = (await runQuery(
      `SELECT ${columnSql} FROM ${ensureIdentifier(relation.table, 'table')} WHERE ${ensureIdentifier(relation.remoteKey, 'column')} IN (${placeholders.join(', ')})`,
      params
    )).map(mapRow);
    const relatedById = new Map(relatedRows.map((row) => [row[relation.remoteKey], row]));

    augmented.forEach((row) => {
      row[spec.alias] = relatedById.get(row[spec.localKey || relation.localKey]) || null;
    });
  }

  return augmented;
};

const executeSelect = async ({ table, select = '*', filters = [], order = [], limit, range, head, count }) => {
  const safeTable = ensureIdentifier(table, 'table');
  const { whereClause, params, postFilters } = buildWhereClause(filters);
  const orderSpecs = Array.isArray(order) ? order : [order].filter(Boolean);
  const orderClause = orderSpecs.length > 0
    ? ' ORDER BY ' + orderSpecs.map((entry) => `${ensureIdentifier(entry.column, 'order column')} ${entry.ascending === false ? 'DESC' : 'ASC'}`).join(', ')
    : '';

  const topClause = limit && !range ? `TOP ${Number(limit)}` : '';
  const offsetClause = range
    ? ` OFFSET ${Math.max(Number(range.from) || 0, 0)} ROWS FETCH NEXT ${Math.max((Number(range.to) || 0) - (Number(range.from) || 0) + 1, 1)} ROWS ONLY`
    : '';

  const queryText = `SELECT ${topClause} * FROM ${safeTable} ${whereClause}${orderClause}${offsetClause}`.replace(/\s+/g, ' ').trim();
  let rows = (await runQuery(queryText, params)).map(mapRow);
  rows = applyPostFilters(rows, postFilters);
  rows = await augmentRows(safeTable, select, rows);

  return {
    data: head ? null : rows,
    count: count ? rows.length : null,
    error: null
  };
};

const executeInsert = async ({ table, payload }) => {
  const safeTable = ensureIdentifier(table, 'table');
  const rows = Array.isArray(payload) ? payload : [payload];
  const inserted = [];

  for (const row of rows) {
    const entries = Object.entries(row || {}).filter(([key, value]) => IDENTIFIER_REGEX.test(key) && value !== undefined);
    if (entries.length === 0) continue;

    const params = {};
    const columns = [];
    const values = [];
    entries.forEach(([key, value], index) => {
      const paramKey = `value${index}`;
      columns.push(key);
      values.push(`@${paramKey}`);
      params[paramKey] = normalizeValue(value);
    });

    const result = await runQuery(
      `INSERT INTO ${safeTable} (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${values.join(', ')})`,
      params
    );
    inserted.push(...result.map(mapRow));
  }

  return { data: Array.isArray(payload) ? inserted : inserted[0] || null, error: null };
};

const executeUpdate = async ({ table, payload, filters = [] }) => {
  const safeTable = ensureIdentifier(table, 'table');
  const entries = Object.entries(payload || {}).filter(([key, value]) => IDENTIFIER_REGEX.test(key) && value !== undefined);
  if (entries.length === 0) {
    return executeSelect({ table, filters });
  }

  const { whereClause, params, postFilters } = buildWhereClause(filters);
  if (postFilters.length > 0) {
    throw new Error('Unsupported update filter.');
  }

  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = normalizeValue(value);
    return `${key} = @${paramKey}`;
  });

  const rows = await runQuery(
    `UPDATE ${safeTable} SET ${assignments.join(', ')} OUTPUT INSERTED.* ${whereClause}`,
    params
  );

  const mappedRows = rows.map(mapRow);
  return { data: mappedRows, error: null };
};

const executeDelete = async ({ table, filters = [] }) => {
  const safeTable = ensureIdentifier(table, 'table');
  const { whereClause, params, postFilters } = buildWhereClause(filters);
  if (postFilters.length > 0) {
    throw new Error('Unsupported delete filter.');
  }

  const rows = await runQuery(
    `DELETE FROM ${safeTable} OUTPUT DELETED.* ${whereClause}`,
    params
  );

  return { data: rows.map(mapRow), error: null };
};

const executeUpsert = async ({ table, payload }) => {
  const rows = Array.isArray(payload) ? payload : [payload];
  const results = [];

  for (const row of rows) {
    if (row?.id) {
      const existing = await runSingleQuery(`SELECT TOP 1 * FROM ${ensureIdentifier(table, 'table')} WHERE id = @id`, { id: row.id });
      if (existing) {
        const updated = await executeUpdate({ table, payload: row, filters: [{ column: 'id', operator: 'eq', value: row.id }] });
        results.push(...(updated.data || []));
        continue;
      }
    }

    const inserted = await executeInsert({ table, payload: row });
    results.push(...(Array.isArray(inserted.data) ? inserted.data : [inserted.data].filter(Boolean)));
  }

  return { data: Array.isArray(payload) ? results : results[0] || null, error: null };
};

const executeRpc = async (name, args = {}) => {
  switch (name) {
    case 'exec_sql': {
      const sqlText = args.sql || args.sql_query;
      if (!sqlText) {
        throw new Error('sql is required');
      }
      return { data: await runQuery(sqlText), error: null };
    }
    case 'get_table_columns': {
      const tableName = ensureIdentifier(args.table_name || args.tableName, 'table');
      const rows = await runQuery(
        `SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION`,
        { tableName }
      );
      return { data: rows.map((row) => row.column_name), error: null };
    }
    case 'reject_utility_reading': {
      const readingId = args.reading_id || args.readingId;
      if (!readingId) throw new Error('reading_id is required');
      const rows = await runQuery(
        `UPDATE utility_readings SET status = 'rejected', updatedat = @updatedat OUTPUT INSERTED.* WHERE id = @readingId`,
        { readingId, updatedat: new Date().toISOString() }
      );
      return { data: rows.map(mapRow)[0] || null, error: null };
    }
    case 'update_agreement_status': {
      const agreementId = args.agreement_id || args.agreementId;
      const status = args.new_status || args.status;
      if (!agreementId || !status) throw new Error('agreement_id and status are required');
      const rows = await runQuery(
        `UPDATE agreements SET status = @status, updatedat = @updatedat OUTPUT INSERTED.* WHERE id = @agreementId`,
        { agreementId, status, updatedat: new Date().toISOString() }
      );
      return { data: rows.map(mapRow)[0] || null, error: null };
    }
    case 'get_rentees_by_property': {
      const propertyId = args.property_id || args.propertyId;
      const rows = await runQuery(
        `SELECT DISTINCT u.*
         FROM app_users u
         LEFT JOIN agreements a ON a.renteeid = u.id
         WHERE (a.propertyid = @propertyId OR u.associated_property_ids LIKE '%' + @propertyId + '%')
           AND u.user_type = 'rentee'`,
        { propertyId }
      );
      return { data: rows.map(mapRow), error: null };
    }
    case 'get_rentees_by_unit': {
      const unitId = args.unit_id || args.unitId;
      const rows = await runQuery(
        `SELECT DISTINCT u.*
         FROM app_users u
         INNER JOIN agreements a ON a.renteeid = u.id
         WHERE a.unitid = @unitId
           AND u.user_type = 'rentee'`,
        { unitId }
      );
      return { data: rows.map(mapRow), error: null };
    }
    case 'test_status_value':
    case 'create_policy':
    case 'enable_rls':
    case 'create_app_users_table':
    case 'create_create_app_users_table_procedure':
      return { data: true, error: null };
    default:
      throw new Error(`Unsupported RPC: ${name}`);
  }
};

const ensureBucketPath = async (bucket) => {
  const safeBucket = ensureIdentifier(bucket, 'bucket');
  const bucketPath = path.join(STORAGE_ROOT, safeBucket);
  await fs.mkdir(bucketPath, { recursive: true });
  return { safeBucket, bucketPath };
};

const listDirectory = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const items = [];

  for (const entry of entries) {
    const itemPath = path.join(dirPath, entry.name);
    const stats = await fs.stat(itemPath).catch(() => null);
    items.push({
      id: entry.isDirectory() ? null : crypto.createHash('md5').update(itemPath).digest('hex'),
      name: entry.name,
      created_at: stats?.birthtime?.toISOString?.() || null,
      updated_at: stats?.mtime?.toISOString?.() || null,
      last_accessed_at: stats?.atime?.toISOString?.() || null,
      metadata: entry.isDirectory() ? null : { size: stats?.size || 0 }
    });
  }

  return items;
};

export const createPlatformRouter = () => {
  const router = express.Router();

  router.post('/query', async (req, res, next) => {
    try {
      const { action = 'select', table, select, filters, order, limit, range, payload, head, count } = req.body || {};
      if (!table) {
        res.status(400).json({ error: 'table is required' });
        return;
      }

      let result;
      switch (action) {
        case 'select':
          if (!isMssqlConfigured()) {
            result = {
              data: head ? null : [],
              count: count ? 0 : null,
              error: null,
              meta: { databaseConfigured: false }
            };
            break;
          }

          result = await executeSelect({ table, select, filters, order, limit, range, head, count });
          break;
        case 'insert':
          result = await executeInsert({ table, payload });
          break;
        case 'update':
          result = await executeUpdate({ table, payload, filters });
          break;
        case 'delete':
          result = await executeDelete({ table, filters });
          break;
        case 'upsert':
          result = await executeUpsert({ table, payload });
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      res.json(result);
    } catch (error) {
      if (action === 'select' && isMssqlUnavailableError(error)) {
        res.json({
          data: head ? null : [],
          count: count ? 0 : null,
          error: null,
          meta: { databaseConfigured: false }
        });
        return;
      }

      next(error);
    }
  });

  router.post('/rpc/:name', async (req, res, next) => {
    try {
      if (!isMssqlConfigured()) {
        if (req.params.name === 'get_table_columns') {
          res.json({ data: [], error: null, meta: { databaseConfigured: false } });
          return;
        }

        if (['create_policy', 'enable_rls', 'create_app_users_table', 'create_create_app_users_table_procedure', 'test_status_value'].includes(req.params.name)) {
          res.json({ data: true, error: null, meta: { databaseConfigured: false } });
          return;
        }
      }

      const result = await executeRpc(req.params.name, req.body || {});
      res.json(result);
    } catch (error) {
      if (req.params.name === 'get_table_columns' && isMssqlUnavailableError(error)) {
        res.json({ data: [], error: null, meta: { databaseConfigured: false } });
        return;
      }

      next(error);
    }
  });

  router.post('/auth/sign-up', async (req, res, next) => {
    try {
      const { email, password, role = 'authenticated', metadata = {} } = req.body || {};
      const { record, created } = await ensureAuthRecord({ email, password, role, metadata });
      if (!created) {
        res.status(409).json({ error: 'User already exists.' });
        return;
      }
      res.status(201).json({ data: { user: buildAuthUser(record), session: buildSession(record) } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/sign-in', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      const store = await readAuthStore();
      const record = store.users.find((user) => user.email === String(email || '').trim().toLowerCase());
      if (!record || record.passwordHash !== hashPassword(password)) {
        res.status(401).json({ error: 'Invalid login credentials' });
        return;
      }
      record.updatedAt = new Date().toISOString();
      await writeAuthStore(store);
      res.json({ data: { user: buildAuthUser(record), session: buildSession(record) } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/update-user', async (req, res, next) => {
    try {
      const { authId, email, password, metadata } = req.body || {};
      const store = await readAuthStore();
      const record = store.users.find((user) => user.authId === authId || user.email === String(email || '').trim().toLowerCase());
      if (!record) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (password) {
        record.passwordHash = hashPassword(password);
      }
      if (metadata && typeof metadata === 'object') {
        record.metadata = { ...(record.metadata || {}), ...metadata };
      }
      record.updatedAt = new Date().toISOString();
      await writeAuthStore(store);
      res.json({ data: { user: buildAuthUser(record), session: buildSession(record) } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/reset-password', async (req, res) => {
    res.json({ data: { sent: true, email: req.body?.email || null } });
  });

  router.post('/auth/otp', async (req, res, next) => {
    try {
      const { email, options = {} } = req.body || {};
      const role = options?.data?.role || 'authenticated';
      const metadata = options?.data || {};
      const { record } = await ensureAuthRecord({ email, password: crypto.randomUUID(), role, metadata });
      res.json({ data: { user: buildAuthUser(record), session: null } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/invite', async (req, res, next) => {
    try {
      const { email, options = {} } = req.body || {};
      const role = options?.data?.role || 'authenticated';
      const metadata = options?.data || {};
      const { record } = await ensureAuthRecord({ email, password: crypto.randomUUID(), role, metadata: { ...metadata, invited: true } });
      res.json({ data: { user: buildAuthUser(record) } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/storage/buckets', async (_req, res, next) => {
    try {
      await fs.mkdir(STORAGE_ROOT, { recursive: true });
      const entries = await fs.readdir(STORAGE_ROOT, { withFileTypes: true });
      const buckets = entries.filter((entry) => entry.isDirectory()).map((entry) => ({ id: entry.name, name: entry.name, public: true }));
      res.json({ data: buckets });
    } catch (error) {
      next(error);
    }
  });

  router.post('/storage/buckets', async (req, res, next) => {
    try {
      const bucketName = req.body?.bucketName || req.body?.name;
      const { safeBucket } = await ensureBucketPath(bucketName);
      res.status(201).json({ data: { id: safeBucket, name: safeBucket, public: true } });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/storage/buckets/:bucket', async (req, res, next) => {
    try {
      const { bucketPath } = await ensureBucketPath(req.params.bucket);
      await fs.rm(bucketPath, { recursive: true, force: true });
      res.json({ data: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/storage/list', async (req, res, next) => {
    try {
      const { bucketPath } = await ensureBucketPath(req.query.bucket);
      const relativePath = String(req.query.path || '').replace(/\\/g, '/');
      const targetPath = path.join(bucketPath, relativePath);
      const items = await listDirectory(targetPath);
      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  });

  router.post('/storage/upload', express.raw({ type: '*/*', limit: '25mb' }), async (req, res, next) => {
    try {
      const bucket = req.query.bucket;
      const relativePath = String(req.query.path || '').replace(/\\/g, '/');
      const { bucketPath, safeBucket } = await ensureBucketPath(bucket);
      const targetPath = path.join(bucketPath, relativePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, req.body);
      res.status(201).json({ data: { path: relativePath, fullPath: `${safeBucket}/${relativePath}` } });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/storage/objects', async (req, res, next) => {
    try {
      const { bucketPath } = await ensureBucketPath(req.body?.bucket || req.query.bucket);
      const pathsToDelete = Array.isArray(req.body?.paths) ? req.body.paths : [];
      await Promise.all(pathsToDelete.map((item) => fs.rm(path.join(bucketPath, item), { force: true, recursive: true })));
      res.json({ data: pathsToDelete.map((item) => ({ name: item })) });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
