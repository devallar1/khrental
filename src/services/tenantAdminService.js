import { requestMssqlApi } from './mssqlApiClient';

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const listAdminTenants = async (params = {}) => requestMssqlApi(`/api/mssql/admin/tenants${toQueryString(params)}`);

export const createAdminTenant = async (payload) => requestMssqlApi('/api/mssql/admin/tenants', {
  method: 'POST',
  body: payload
});

export const updateAdminTenant = async (tenantId, payload) => requestMssqlApi(`/api/mssql/admin/tenants/${tenantId}`, {
  method: 'PUT',
  body: payload
});

export const listAdminAppUsers = async (params = {}) => requestMssqlApi(`/api/mssql/admin/app-users${toQueryString(params)}`);

export const createAdminAppUser = async (payload) => requestMssqlApi('/api/mssql/admin/app-users', {
  method: 'POST',
  body: payload
});

export const listAdminTenantMemberships = async (tenantId, params = {}) => requestMssqlApi(`/api/mssql/admin/tenants/${tenantId}/memberships${toQueryString(params)}`);

export const createAdminTenantMembership = async (tenantId, payload) => requestMssqlApi(`/api/mssql/admin/tenants/${tenantId}/memberships`, {
  method: 'POST',
  body: payload
});

export const updateAdminTenantMembership = async (tenantId, membershipId, payload) => requestMssqlApi(`/api/mssql/admin/tenants/${tenantId}/memberships/${membershipId}`, {
  method: 'PUT',
  body: payload
});

export const deleteAdminTenantMembership = async (tenantId, membershipId) => requestMssqlApi(`/api/mssql/admin/tenants/${tenantId}/memberships/${membershipId}`, {
  method: 'DELETE'
});