import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { getMssqlPool } from '../src/api/mssql/pool.js';

process.env.MSSQL_SERVER ||= 'localhost';
process.env.MSSQL_PORT ||= '1433';
process.env.MSSQL_DATABASE ||= 'khrental';
process.env.MSSQL_USER ||= 'sa';
process.env.MSSQL_PASSWORD ||= 'ChangeMe123!';
process.env.MSSQL_ENCRYPT ||= 'false';
process.env.MSSQL_TRUST_SERVER_CERTIFICATE ||= 'true';

const STORAGE_ROOT = path.resolve(process.cwd(), 'public', 'storage');
const KNOWN_BUCKETS = new Set(['images', 'files', 'documents', 'invoices', 'media', 'maintenance']);
const APPLY = process.argv.includes('--apply');

const MIGRATION_TARGETS = [
  {
    name: 'maintenance_request_images.image_url',
    table: 'maintenance_request_images',
    requiredColumns: ['id', 'tenant_id', 'image_url'],
    kind: 'single',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, image_url AS asset_url
      FROM dbo.maintenance_request_images
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(image_url)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.maintenance_request_images SET image_url = @asset_url WHERE id = @id'
  },
  {
    name: 'utility_readings.photourl',
    table: 'utility_readings',
    requiredColumns: ['id', 'tenant_id', 'photourl'],
    kind: 'single',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, photourl AS asset_url
      FROM dbo.utility_readings
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(photourl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.utility_readings SET photourl = @asset_url WHERE id = @id'
  },
  {
    name: 'invoices.paymentproofurl',
    table: 'invoices',
    requiredColumns: ['id', 'tenant_id', 'paymentproofurl'],
    kind: 'single',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, paymentproofurl AS asset_url
      FROM dbo.invoices
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(paymentproofurl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.invoices SET paymentproofurl = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.signed_document_url',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'signed_document_url'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, signed_document_url AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(signed_document_url)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET signed_document_url = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.pdfurl',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'pdfurl'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, pdfurl AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(pdfurl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET pdfurl = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.documenturl',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'documenturl'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, documenturl AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(documenturl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET documenturl = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.signeddocumenturl',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'signeddocumenturl'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, signeddocumenturl AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(signeddocumenturl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET signeddocumenturl = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.signatureurl',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'signatureurl'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, signatureurl AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(signatureurl)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET signatureurl = @asset_url WHERE id = @id'
  },
  {
    name: 'agreements.signature_pdf_url',
    table: 'agreements',
    requiredColumns: ['id', 'tenant_id', 'signature_pdf_url'],
    kind: 'single',
    defaultBucket: 'files',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, signature_pdf_url AS asset_url
      FROM dbo.agreements
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(signature_pdf_url)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.agreements SET signature_pdf_url = @asset_url WHERE id = @id'
  },
  {
    name: 'app_users.id_copy_url',
    table: 'app_users',
    requiredColumns: ['id', 'tenant_id', 'id_copy_url'],
    kind: 'single',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, id_copy_url AS asset_url
      FROM dbo.app_users
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(id_copy_url)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.app_users SET id_copy_url = @asset_url WHERE id = @id'
  },
  {
    name: 'app_users.profile_image_url',
    table: 'app_users',
    requiredColumns: ['id', 'tenant_id', 'profile_image_url'],
    kind: 'single',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, profile_image_url AS asset_url
      FROM dbo.app_users
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(profile_image_url)), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.app_users SET profile_image_url = @asset_url WHERE id = @id'
  },
  {
    name: 'properties.images',
    table: 'properties',
    requiredColumns: ['id', 'tenant_id', 'images'],
    kind: 'json-array',
    defaultBucket: 'images',
    selectSql: `
      SELECT CAST(id AS nvarchar(36)) AS id, CAST(tenant_id AS nvarchar(36)) AS tenant_id, images AS asset_json
      FROM dbo.properties
      WHERE tenant_id IS NOT NULL AND NULLIF(LTRIM(RTRIM(CAST(images AS nvarchar(max)))), N'') IS NOT NULL
    `,
    updateSql: 'UPDATE dbo.properties SET images = @asset_json WHERE id = @id'
  }
];

const normalizePath = (value = '') => String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const looksLikeInlineHtml = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('<')
    || normalized.includes('<!doctype')
    || normalized.includes('<html')
    || normalized.includes('<body')
    || normalized.includes('<div')
    || normalized.includes('<p');
};

const parseStorageReference = (value, defaultBucket = null) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const parts = normalizePath(url.pathname).split('/');
    const storageIndex = parts.indexOf('storage');

    if (storageIndex >= 0 && parts[storageIndex + 1]) {
      return {
        bucket: parts[storageIndex + 1],
        relativePath: parts.slice(storageIndex + 2).join('/'),
        originalUrl: url
      };
    }
  } catch (_error) {
    // Treat as relative path below.
  }

  const normalized = normalizePath(trimmed);
  const normalizedParts = normalized.split('/');

  if (normalizedParts[0] === 'storage' && normalizedParts[1]) {
    return {
      bucket: normalizedParts[1],
      relativePath: normalizedParts.slice(2).join('/'),
      originalUrl: null
    };
  }

  const [bucket, ...rest] = normalized.split('/');

  if (KNOWN_BUCKETS.has(bucket) && rest.length > 0) {
    return { bucket, relativePath: rest.join('/'), originalUrl: null };
  }

  if (defaultBucket && normalized) {
    return { bucket: defaultBucket, relativePath: normalized, originalUrl: null };
  }

  if (normalized.startsWith('tenants/')) {
    return { bucket: 'images', relativePath: normalized, originalUrl: null };
  }

  return null;
};

const buildUpdatedUrl = (originalValue, bucket, relativePath) => {
  const normalizedRelativePath = normalizePath(relativePath);

  try {
    const originalUrl = new URL(originalValue);
    originalUrl.pathname = `/storage/${bucket}/${normalizedRelativePath}`;
    originalUrl.search = '';
    originalUrl.hash = '';
    return originalUrl.toString();
  } catch (_error) {
    return `/storage/${bucket}/${normalizedRelativePath}`;
  }
};

const ensureTenantScopedPath = (tenantId, relativePath) => {
  const normalizedTenantId = normalizePath(tenantId);
  const normalizedRelativePath = normalizePath(relativePath);

  if (!normalizedTenantId || !normalizedRelativePath) {
    return normalizedRelativePath;
  }

  if (normalizedRelativePath.startsWith(`tenants/${normalizedTenantId}/`)) {
    return normalizedRelativePath;
  }

  if (normalizedRelativePath.startsWith('tenants/')) {
    return normalizedRelativePath;
  }

  return `tenants/${normalizedTenantId}/${normalizedRelativePath}`;
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
};

const copyLegacyFile = async (sourcePath, destinationPath) => {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
};

const isTargetAvailable = async (pool, target) => {
  const columns = target.requiredColumns || [];

  if (!target.table || columns.length === 0) {
    return true;
  }

  const result = await pool.request()
    .input('tableName', target.table)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
    `);

  const availableColumns = new Set((result.recordset || []).map((row) => String(row.COLUMN_NAME || '').toLowerCase()));
  return columns.every((column) => availableColumns.has(column.toLowerCase()));
};

const migrateSingleAssetValue = async ({ tenantId, assetUrl, defaultBucket }) => {
  if (looksLikeInlineHtml(assetUrl)) {
    return { status: 'htmlContent', value: assetUrl };
  }

  const parsed = parseStorageReference(assetUrl, defaultBucket);
  if (!parsed?.bucket || !parsed?.relativePath) {
    return { status: 'unsupported', value: assetUrl };
  }

  if (normalizePath(parsed.relativePath).startsWith('tenants/')) {
    return { status: 'alreadyScoped', value: assetUrl };
  }

  const tenantScopedPath = ensureTenantScopedPath(tenantId, parsed.relativePath);
  const sourceAbsolutePath = path.join(STORAGE_ROOT, parsed.bucket, normalizePath(parsed.relativePath));
  const targetAbsolutePath = path.join(STORAGE_ROOT, parsed.bucket, tenantScopedPath);

  if (!(await fileExists(sourceAbsolutePath))) {
    return { status: 'missingFile', value: assetUrl };
  }

  if (APPLY && !(await fileExists(targetAbsolutePath))) {
    await copyLegacyFile(sourceAbsolutePath, targetAbsolutePath);
  }

  return {
    status: 'updated',
    value: buildUpdatedUrl(assetUrl, parsed.bucket, tenantScopedPath)
  };
};

const migrateJsonArrayValue = async ({ tenantId, assetJson, defaultBucket }) => {
  let parsedJson;

  if (Array.isArray(assetJson)) {
    parsedJson = assetJson;
  } else if (typeof assetJson === 'string') {
    try {
      parsedJson = JSON.parse(assetJson);
    } catch (_error) {
      return { status: 'unsupported', value: assetJson, updatesApplied: 0, missingFiles: 0, alreadyScoped: 0 };
    }
  } else {
    return { status: 'unsupported', value: assetJson, updatesApplied: 0, missingFiles: 0, alreadyScoped: 0 };
  }

  if (!Array.isArray(parsedJson)) {
    return { status: 'unsupported', value: assetJson, updatesApplied: 0, missingFiles: 0, alreadyScoped: 0 };
  }

  let updatesApplied = 0;
  let missingFiles = 0;
  let alreadyScoped = 0;
  let unsupported = 0;

  const migratedArray = [];

  for (const item of parsedJson) {
    if (typeof item === 'string') {
      const migrated = await migrateSingleAssetValue({ tenantId, assetUrl: item, defaultBucket });
      if (migrated.status === 'updated') {
        updatesApplied += 1;
      } else if (migrated.status === 'missingFile') {
        missingFiles += 1;
      } else if (migrated.status === 'alreadyScoped') {
        alreadyScoped += 1;
      } else {
        unsupported += 1;
      }

      migratedArray.push(migrated.value);
      continue;
    }

    if (item && typeof item === 'object' && typeof item.image_url === 'string') {
      const migrated = await migrateSingleAssetValue({ tenantId, assetUrl: item.image_url, defaultBucket });
      if (migrated.status === 'updated') {
        updatesApplied += 1;
      } else if (migrated.status === 'missingFile') {
        missingFiles += 1;
      } else if (migrated.status === 'alreadyScoped') {
        alreadyScoped += 1;
      } else {
        unsupported += 1;
      }

      migratedArray.push({
        ...item,
        image_url: migrated.value
      });
      continue;
    }

    unsupported += 1;
    migratedArray.push(item);
  }

  return {
    status: updatesApplied > 0 ? 'updated' : 'unchanged',
    value: JSON.stringify(migratedArray),
    updatesApplied,
    missingFiles,
    alreadyScoped,
    unsupported
  };
};

const migrateTarget = async (pool, target) => {
  const summary = {
    target: target.name,
    scanned: 0,
    updated: 0,
    skipped: 0,
    missingFiles: 0,
    alreadyScoped: 0,
    htmlContent: 0,
    unsupported: 0,
    errors: []
  };

  if (!(await isTargetAvailable(pool, target))) {
    summary.scanned = 0;
    summary.skipped = 1;
    return summary;
  }

  const rows = (await pool.request().query(target.selectSql)).recordset || [];
  summary.scanned = rows.length;

  for (const row of rows) {
    try {
      if (target.kind === 'json-array') {
        const migrated = await migrateJsonArrayValue({
          tenantId: row.tenant_id,
          assetJson: row.asset_json,
          defaultBucket: target.defaultBucket || null
        });

        summary.missingFiles += migrated.missingFiles || 0;
        summary.alreadyScoped += migrated.alreadyScoped || 0;
        summary.unsupported += migrated.unsupported || 0;

        if (migrated.status !== 'updated') {
          if (migrated.status === 'unsupported') {
            summary.unsupported += 1;
          }
          continue;
        }

        if (APPLY) {
          await pool.request()
            .input('id', row.id)
            .input('asset_json', migrated.value)
            .query(target.updateSql);
        }

        summary.updated += 1;
        continue;
      }

      const migrated = await migrateSingleAssetValue({
        tenantId: row.tenant_id,
        assetUrl: row.asset_url,
        defaultBucket: target.defaultBucket || null
      });

      if (migrated.status === 'unsupported') {
        summary.unsupported += 1;
        continue;
      }

      if (migrated.status === 'htmlContent') {
        summary.htmlContent += 1;
        continue;
      }

      if (migrated.status === 'alreadyScoped') {
        summary.alreadyScoped += 1;
        continue;
      }

      if (migrated.status === 'missingFile') {
        summary.missingFiles += 1;
        continue;
      }

      if (APPLY) {
        await pool.request()
          .input('id', row.id)
          .input('asset_url', migrated.value)
          .query(target.updateSql);
      }

      summary.updated += 1;
    } catch (error) {
      summary.errors.push({ id: row.id, message: error.message });
    }
  }

  return summary;
};

const main = async () => {
  const pool = await getMssqlPool();
  const results = [];

  for (const target of MIGRATION_TARGETS) {
    results.push(await migrateTarget(pool, target));
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    storageRoot: STORAGE_ROOT,
    results
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});