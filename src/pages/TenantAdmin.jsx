import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import {
  createAdminAppUser,
  createAdminTenant,
  createAdminTenantMembership,
  deleteAdminTenantMembership,
  listAdminAppUsers,
  listAdminTenantMemberships,
  listAdminTenants,
  updateAdminTenant,
  updateAdminTenantMembership
} from '../services/tenantAdminService';

const DEFAULT_TENANT_FORM = {
  name: '',
  slug: '',
  status: 'active',
  plan: 'legacy'
};

const DEFAULT_MEMBERSHIP_FORM = {
  appUserId: '',
  role: 'staff',
  status: 'active',
  isDefault: false
};

const DEFAULT_APP_USER_FORM = {
  email: '',
  name: '',
  role: 'staff',
  userType: 'staff'
};

const roleOptions = ['admin', 'manager', 'staff', 'maintenance_staff', 'finance_staff', 'rentee'];
const statusOptions = ['active', 'inactive'];

const summarizeTenant = (tenant) => {
  if (!tenant) {
    return 'No tenant selected';
  }

  return `${tenant.name || tenant.slug} • ${tenant.membership_count || 0} members`;
};

const TenantAdmin = () => {
  const { user, refreshTenantContext } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantForm, setTenantForm] = useState(DEFAULT_TENANT_FORM);
  const [tenantSaving, setTenantSaving] = useState(false);

  const [memberships, setMemberships] = useState([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [membershipSavingId, setMembershipSavingId] = useState(null);
  const [membershipDeletingId, setMembershipDeletingId] = useState(null);
  const [membershipForm, setMembershipForm] = useState(DEFAULT_MEMBERSHIP_FORM);
  const [membershipCreating, setMembershipCreating] = useState(false);
  const [appUserForm, setAppUserForm] = useState(DEFAULT_APP_USER_FORM);
  const [appUserCreating, setAppUserCreating] = useState(false);

  const [appUserSearch, setAppUserSearch] = useState('');
  const [appUserResults, setAppUserResults] = useState([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  const applyTenantToForm = (tenant) => {
    setTenantForm({
      name: tenant?.name || '',
      slug: tenant?.slug || '',
      status: tenant?.status || 'active',
      plan: tenant?.plan || 'legacy'
    });
  };

  const loadTenants = async (preferredTenantId = null) => {
    try {
      setTenantsLoading(true);
      const data = await listAdminTenants({ search: tenantSearch || undefined, pageSize: 100 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setTenants(items);

      const nextTenant = (preferredTenantId && items.find((tenant) => tenant.id === preferredTenantId))
        || (selectedTenantId && items.find((tenant) => tenant.id === selectedTenantId))
        || items[0]
        || null;

      setSelectedTenantId(nextTenant?.id || null);
      applyTenantToForm(nextTenant);
    } catch (error) {
      toast.error(error.message || 'Failed to load tenants');
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadMemberships = async (tenantId) => {
    if (!tenantId) {
      setMemberships([]);
      return;
    }

    try {
      setMembershipsLoading(true);
      const data = await listAdminTenantMemberships(tenantId, { pageSize: 100 });
      setMemberships(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load memberships');
    } finally {
      setMembershipsLoading(false);
    }
  };

  const searchAppUsers = async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setAppUserResults([]);
      return;
    }

    try {
      setAppUsersLoading(true);
      const data = await listAdminAppUsers({ search: searchValue.trim(), pageSize: 20 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setAppUserResults(items);
    } catch (error) {
      toast.error(error.message || 'Failed to search app users');
    } finally {
      setAppUsersLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTenantToForm(selectedTenant);
  }, [selectedTenant]);

  useEffect(() => {
    loadMemberships(selectedTenantId);
  }, [selectedTenantId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAppUsers(appUserSearch);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [appUserSearch]);

  const handleTenantSubmit = async (event) => {
    event.preventDefault();

    try {
      setTenantSaving(true);
      const payload = {
        name: tenantForm.name,
        slug: tenantForm.slug,
        status: tenantForm.status,
        plan: tenantForm.plan,
        settings: {
          branding_json: {
            name: tenantForm.name
          }
        }
      };

      let savedTenant;
      if (selectedTenant?.id) {
        savedTenant = await updateAdminTenant(selectedTenant.id, payload);
        toast.success('Tenant updated');
      } else {
        savedTenant = await createAdminTenant(payload);
        toast.success('Tenant created');
      }

      await loadTenants(savedTenant?.id || null);
    } catch (error) {
      toast.error(error.message || 'Failed to save tenant');
    } finally {
      setTenantSaving(false);
    }
  };

  const handleCreateTenant = () => {
    setSelectedTenantId(null);
    setTenantForm(DEFAULT_TENANT_FORM);
    setMemberships([]);
  };

  const refreshCurrentUserTenantContextIfNeeded = async (appUserId) => {
    if (!appUserId) {
      return;
    }

    if (appUserId === user?.profileId) {
      await refreshTenantContext();
    }
  };

  const handleMembershipCreate = async (event) => {
    event.preventDefault();

    if (!selectedTenantId) {
      toast.error('Select a tenant first');
      return;
    }

    if (!membershipForm.appUserId) {
      toast.error('Select an app user');
      return;
    }

    try {
      setMembershipCreating(true);
      const createdMembership = await createAdminTenantMembership(selectedTenantId, {
        app_user_id: membershipForm.appUserId,
        role: membershipForm.role,
        status: membershipForm.status,
        is_default: membershipForm.isDefault
      });

      toast.success('Membership added');
      setMembershipForm(DEFAULT_MEMBERSHIP_FORM);
      setAppUserSearch('');
      setAppUserResults([]);
      await loadTenants(selectedTenantId);
      await loadMemberships(selectedTenantId);
      await refreshCurrentUserTenantContextIfNeeded(createdMembership?.app_user_id);
    } catch (error) {
      toast.error(error.message || 'Failed to add membership');
    } finally {
      setMembershipCreating(false);
    }
  };

  const handleAdminAppUserCreate = async (event) => {
    event.preventDefault();

    if (!selectedTenantId) {
      toast.error('Select a tenant first');
      return;
    }

    if (!appUserForm.email || !appUserForm.name) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setAppUserCreating(true);
      const createdUser = await createAdminAppUser({
        tenant_id: selectedTenantId,
        email: appUserForm.email.trim().toLowerCase(),
        name: appUserForm.name.trim(),
        role: appUserForm.role,
        user_type: appUserForm.userType
      });

      toast.success('App user created');
      setAppUserForm(DEFAULT_APP_USER_FORM);
      setAppUserSearch(createdUser?.email || '');
      setAppUserResults((current) => {
        const next = [createdUser, ...current.filter((entry) => entry.id !== createdUser?.id)];
        return next.slice(0, 20);
      });
      setMembershipForm((current) => ({
        ...current,
        appUserId: createdUser?.id || current.appUserId,
        role: createdUser?.role || current.role
      }));
      await loadTenants(selectedTenantId);
    } catch (error) {
      toast.error(error.message || 'Failed to create app user');
    } finally {
      setAppUserCreating(false);
    }
  };

  const handleMembershipUpdate = async (membershipId, nextValues) => {
    if (!selectedTenantId) {
      return;
    }

    try {
      setMembershipSavingId(membershipId);
      const updatedMembership = await updateAdminTenantMembership(selectedTenantId, membershipId, nextValues);
      toast.success('Membership updated');
      await loadTenants(selectedTenantId);
      await loadMemberships(selectedTenantId);
      await refreshCurrentUserTenantContextIfNeeded(updatedMembership?.app_user_id);
    } catch (error) {
      toast.error(error.message || 'Failed to update membership');
    } finally {
      setMembershipSavingId(null);
    }
  };

  const handleMembershipDelete = async (membership) => {
    if (!selectedTenantId || !membership?.id) {
      return;
    }

    try {
      setMembershipDeletingId(membership.id);
      await deleteAdminTenantMembership(selectedTenantId, membership.id);
      toast.success('Membership removed');
      await loadTenants(selectedTenantId);
      await loadMemberships(selectedTenantId);
      await refreshCurrentUserTenantContextIfNeeded(membership?.app_user_id);
    } catch (error) {
      toast.error(error.message || 'Failed to remove membership');
    } finally {
      setMembershipDeletingId(null);
    }
  };

  return (
    <div className="app-page">
      <div className="page-hero">
        <p className="page-kicker">Sprint 09</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Tenant Administration</h1>
            <p className="page-subtitle">
              Manage platform tenants, keep core metadata aligned, and assign memberships without leaving the app.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm shadow-sm backdrop-blur-sm">
            <div className="text-sky-100/70">Current selection</div>
            <div className="mt-1 font-medium">{summarizeTenant(selectedTenant)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="app-panel">
          <div className="app-panel-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tenants</h2>
                <p className="text-sm text-slate-500">Platform-wide tenant registry</p>
              </div>
              <button
                type="button"
                onClick={handleCreateTenant}
                className="app-button-secondary"
              >
                New tenant
              </button>
            </div>
            <input
              type="text"
              value={tenantSearch}
              onChange={(event) => setTenantSearch(event.target.value)}
              onBlur={() => loadTenants()}
              placeholder="Search by tenant name or slug"
              className="app-input mt-4"
            />
          </div>
          <div className="max-h-[640px] overflow-y-auto p-3">
            {tenantsLoading ? (
              <div className="app-empty-state">Loading tenants...</div>
            ) : tenants.length === 0 ? (
              <div className="app-empty-state">No tenants found.</div>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => {
                  const isActive = tenant.id === selectedTenantId;
                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-900/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{tenant.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{tenant.slug}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {tenant.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{tenant.plan || 'legacy'}</span>
                        <span>{tenant.membership_count || 0} members</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="app-panel">
            <div className="app-panel-header">
              <h2 className="text-lg font-semibold text-slate-900">Tenant profile</h2>
              <p className="text-sm text-slate-500">Create a new tenant or update the selected tenant’s core metadata.</p>
            </div>
            <form onSubmit={handleTenantSubmit} className="grid gap-4 p-5 md:grid-cols-2">
              <label className="app-label">
                Tenant name
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(event) => setTenantForm((current) => ({ ...current, name: event.target.value }))}
                  className="app-input"
                  required
                />
              </label>
              <label className="app-label">
                Slug
                <input
                  type="text"
                  value={tenantForm.slug}
                  onChange={(event) => setTenantForm((current) => ({ ...current, slug: event.target.value }))}
                  className="app-input"
                  required
                />
              </label>
              <label className="app-label">
                Status
                <select
                  value={tenantForm.status}
                  onChange={(event) => setTenantForm((current) => ({ ...current, status: event.target.value }))}
                  className="app-select"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="app-label">
                Plan
                <input
                  type="text"
                  value={tenantForm.plan}
                  onChange={(event) => setTenantForm((current) => ({ ...current, plan: event.target.value }))}
                  className="app-input"
                />
              </label>
              <div className="md:col-span-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span>{selectedTenant ? `Editing ${selectedTenant.name}` : 'Creating a new tenant record'}</span>
                <button
                  type="submit"
                  disabled={tenantSaving}
                  className="app-button"
                >
                  {tenantSaving ? 'Saving...' : selectedTenant ? 'Save tenant' : 'Create tenant'}
                </button>
              </div>
            </form>
          </section>

          <section className="app-panel">
            <div className="app-panel-header">
              <h2 className="text-lg font-semibold text-slate-900">Tenant memberships</h2>
              <p className="text-sm text-slate-500">Assign existing app users, manage roles, and control which membership is the default.</p>
            </div>

            {!selectedTenant ? (
              <div className="p-5 text-sm text-slate-500">Choose a tenant before editing memberships.</div>
            ) : (
              <div className="space-y-5 p-5">
                <form onSubmit={handleAdminAppUserCreate} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr_auto]">
                  <label className="app-label">
                    New app user email
                    <input
                      type="email"
                      value={appUserForm.email}
                      onChange={(event) => setAppUserForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="user@example.com"
                      className="app-input"
                      required
                    />
                  </label>
                  <label className="app-label">
                    Name
                    <input
                      type="text"
                      value={appUserForm.name}
                      onChange={(event) => setAppUserForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Display name"
                      className="app-input"
                      required
                    />
                  </label>
                  <label className="app-label">
                    Role
                    <select
                      value={appUserForm.role}
                      onChange={(event) => setAppUserForm((current) => ({ ...current, role: event.target.value }))}
                      className="app-select"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label className="app-label">
                    User type
                    <select
                      value={appUserForm.userType}
                      onChange={(event) => setAppUserForm((current) => ({ ...current, userType: event.target.value }))}
                      className="app-select"
                    >
                      <option value="staff">staff</option>
                      <option value="rentee">rentee</option>
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={appUserCreating}
                      className="app-button w-full bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-100"
                    >
                      {appUserCreating ? 'Creating...' : 'Create user'}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleMembershipCreate} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                  <div>
                    <label className="app-label">
                      Find app user
                      <input
                        type="text"
                        value={appUserSearch}
                        onChange={(event) => setAppUserSearch(event.target.value)}
                        placeholder="Search by email or name"
                        className="app-input"
                      />
                    </label>
                    <select
                      value={membershipForm.appUserId}
                      onChange={(event) => setMembershipForm((current) => ({ ...current, appUserId: event.target.value }))}
                      className="app-select mt-2"
                    >
                      <option value="">Select an app user</option>
                      {appUserResults.map((appUser) => (
                        <option key={appUser.id} value={appUser.id}>
                          {(appUser.name || 'Unnamed user')} - {appUser.email || appUser.id}
                        </option>
                      ))}
                    </select>
                    {appUsersLoading && <p className="mt-2 text-xs text-slate-500">Searching users...</p>}
                  </div>
                  <label className="app-label">
                    Role
                    <select
                      value={membershipForm.role}
                      onChange={(event) => setMembershipForm((current) => ({ ...current, role: event.target.value }))}
                      className="app-select"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label className="app-label">
                    Status
                    <select
                      value={membershipForm.status}
                      onChange={(event) => setMembershipForm((current) => ({ ...current, status: event.target.value }))}
                      className="app-select"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-col justify-between gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={membershipForm.isDefault}
                        onChange={(event) => setMembershipForm((current) => ({ ...current, isDefault: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Default
                    </label>
                    <button
                      type="submit"
                      disabled={membershipCreating}
                      className="app-button bg-slate-950 hover:bg-slate-800"
                    >
                      {membershipCreating ? 'Adding...' : 'Add membership'}
                    </button>
                  </div>
                </form>

                {membershipsLoading ? (
                  <div className="app-empty-state">Loading memberships...</div>
                ) : memberships.length === 0 ? (
                  <div className="app-empty-state">
                    No memberships yet. Search for an app user above to assign one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberships.map((membership) => {
                      const isSaving = membershipSavingId === membership.id;
                      const isDeleting = membershipDeletingId === membership.id;

                      return (
                        <div key={membership.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr_auto_auto] lg:items-center">
                          <div>
                            <div className="font-medium text-slate-900">{membership.app_user?.name || 'Unnamed user'}</div>
                            <div className="mt-1 text-sm text-slate-500">{membership.app_user?.email || membership.app_user_id}</div>
                          </div>
                          <select
                            defaultValue={membership.role}
                            disabled={isSaving || isDeleting}
                            onChange={(event) => {
                              setMemberships((current) => current.map((entry) => entry.id === membership.id ? { ...entry, role: event.target.value } : entry));
                            }}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <select
                            defaultValue={membership.status}
                            disabled={isSaving || isDeleting}
                            onChange={(event) => {
                              setMemberships((current) => current.map((entry) => entry.id === membership.id ? { ...entry, status: event.target.value } : entry));
                            }}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(membership.is_default)}
                              disabled={isSaving || isDeleting}
                              onChange={(event) => {
                                setMemberships((current) => current.map((entry) => entry.id === membership.id ? { ...entry, is_default: event.target.checked } : entry));
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Default
                          </label>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isSaving || isDeleting}
                              onClick={() => handleMembershipUpdate(membership.id, {
                                role: membership.role,
                                status: membership.status,
                                is_default: membership.is_default
                              })}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || isDeleting}
                              onClick={() => handleMembershipDelete(membership)}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TenantAdmin;