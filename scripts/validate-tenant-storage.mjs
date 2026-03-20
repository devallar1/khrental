import 'dotenv/config';
import express from 'express';
import { createPlatformRouter } from '../src/api/platform/router.js';

process.env.MSSQL_SERVER ||= 'localhost';
process.env.MSSQL_PORT ||= '1433';
process.env.MSSQL_DATABASE ||= 'khrental';
process.env.MSSQL_USER ||= 'sa';
process.env.MSSQL_PASSWORD ||= 'ChangeMe123!';
process.env.MSSQL_ENCRYPT ||= 'false';
process.env.MSSQL_TRUST_SERVER_CERTIFICATE ||= 'true';

const PORT = 5183;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_HEADERS = {
  'x-auth-id': 'local-test-auth',
  'x-user-email': 'tenant.test@example.com'
};

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api/platform', createPlatformRouter());
app.use((error, _req, res, _next) => {
  res.status(Number(error?.status) || 500).json({
    error: error?.message || 'Unexpected error',
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.details ? { details: error.details } : {})
  });
});

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};

const server = await new Promise((resolve, reject) => {
  const instance = app.listen(PORT, '127.0.0.1', () => resolve(instance));
  instance.on('error', reject);
});

let cleanupAttempted = false;

try {
  const tenantContext = await requestJson('/api/platform/auth/context', {
    method: 'GET',
    headers: AUTH_HEADERS
  });

  const tenantId = tenantContext.body?.data?.tenantId;
  if (tenantContext.status !== 200 || !tenantId) {
    throw new Error(`Failed to resolve tenant context: ${JSON.stringify(tenantContext.body)}`);
  }

  const uploadResult = await requestJson('/api/platform/storage/upload?bucket=images&path=utility-readings/storage-validation.txt', {
    method: 'POST',
    headers: {
      ...AUTH_HEADERS,
      'content-type': 'text/plain'
    },
    body: 'tenant storage validation'
  });

  const expectedPrefix = `tenants/${tenantId}/utility-readings/`;
  const uploadedPath = uploadResult.body?.data?.path || '';

  const listResult = await requestJson('/api/platform/storage/list?bucket=images&path=utility-readings', {
    method: 'GET',
    headers: AUTH_HEADERS
  });

  const blockedUpload = await requestJson('/api/platform/storage/upload?bucket=images&path=tenants/not-the-active-tenant/utility-readings/blocked.txt', {
    method: 'POST',
    headers: {
      ...AUTH_HEADERS,
      'content-type': 'text/plain'
    },
    body: 'blocked'
  });

  const deleteResult = await requestJson('/api/platform/storage/objects', {
    method: 'DELETE',
    headers: {
      ...AUTH_HEADERS,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      bucket: 'images',
      paths: ['utility-readings/storage-validation.txt']
    })
  });
  cleanupAttempted = true;

  console.log(JSON.stringify({
    tenantContext,
    uploadResult,
    uploadPathIsScoped: uploadResult.status === 201 && uploadedPath.startsWith(expectedPrefix),
    listResult,
    listPathIsScoped: listResult.body?.meta?.path === `tenants/${tenantId}/utility-readings`,
    blockedUpload,
    blockedUploadRejected: blockedUpload.status === 403 && blockedUpload.body?.code === 'TENANT_STORAGE_OVERRIDE_BLOCKED',
    deleteResult
  }, null, 2));
} finally {
  if (!cleanupAttempted) {
    await requestJson('/api/platform/storage/objects', {
      method: 'DELETE',
      headers: {
        ...AUTH_HEADERS,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        bucket: 'images',
        paths: ['utility-readings/storage-validation.txt']
      })
    }).catch(() => null);
  }

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}