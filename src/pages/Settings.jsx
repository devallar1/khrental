import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../utils/constants';

const Settings = () => {
  const { user, activeTenant, memberships } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  return (
    <div className="app-page">
      <div className="page-hero">
        <p className="page-kicker">Workspace Settings</p>
        <h1 className="page-title">Settings and administration</h1>
        <p className="page-subtitle">
          Keep user preferences, tenant context, and administrative tools in one place instead of scattering them across placeholder pages.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-panel">
          <div className="app-panel-header">
            <h2 className="text-lg font-semibold text-slate-900">Current workspace</h2>
            <p className="text-sm text-slate-500">Quick context for the active account and tenant.</p>
          </div>
          <div className="app-panel-body space-y-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Signed in as</div>
              <div className="mt-1 font-medium text-slate-900">{user?.email || 'Unknown user'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-1 font-medium capitalize text-slate-900">{user?.role || 'User'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Active tenant</div>
              <div className="mt-1 font-medium text-slate-900">{activeTenant?.name || activeTenant?.slug || 'No tenant selected'}</div>
              <div className="mt-1 text-sm text-slate-500">{memberships?.length || 0} memberships available</div>
            </div>
          </div>
        </section>

        <section className="app-panel">
          <div className="app-panel-header">
            <h2 className="text-lg font-semibold text-slate-900">Administrative surfaces</h2>
            <p className="text-sm text-slate-500">Route users into the right workflow instead of leaving settings as a stub.</p>
          </div>
          <div className="app-panel-body space-y-3">
            {isAdmin ? (
              <>
                <Link to="/dashboard/tenant-admin" className="app-button w-full no-underline">
                  Open Tenant Admin
                </Link>
                <Link to="/dashboard/admin-dashboard" className="app-button-secondary w-full no-underline">
                  Open Admin Dashboard
                </Link>
              </>
            ) : null}
            <Link to="/dashboard" className="app-button-secondary w-full no-underline">
              Return to dashboard
            </Link>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              This page now acts as a stable settings hub. If we add profile preferences, notification settings, or tenant-specific configuration later, they should slot into this structure instead of replacing it.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings; 