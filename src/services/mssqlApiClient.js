import { getApiBaseUrl, isMssqlApiEnabled } from '../utils/env';
import { buildRequestContextHeaders } from './requestContext';

const readErrorMessage = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    return payload?.error || payload?.message || JSON.stringify(payload);
  }

  return response.text().catch(() => '');
};

export const requestMssqlApi = async (path, options = {}) => {
  const {
    method = 'GET',
    headers = {},
    body,
    ...rest
  } = options;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...buildRequestContextHeaders(headers)
    },
    ...(body !== undefined
      ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
      : {}),
    ...rest
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage || `MSSQL API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json();
    return payload?.data ?? payload;
  }

  return response.text();
};

export { isMssqlApiEnabled };
