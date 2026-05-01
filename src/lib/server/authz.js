// Centralized authorization for app routes.
//
// Phase 0 (current): thin wrappers around the existing `tenant_id`
// filtering. Behaviour is unchanged. The point of this module is to be
// the single chokepoint that Phase 2 can swap to the new access model
// (User-or-Org ownership + org_memberships + property_managers +
// vendor_grants + sysadmin override) without re-touching every route.
//
// Rule: route files (+page.server.js, +server.js, etc.) should NOT
// reference `tenant_id` or `locals.tenantId` for filtering. Use the
// helpers here. The /manager exemption goes through assertSysadmin.

import { error } from '@sveltejs/kit';
import { runQuery, runSingleQuery } from '$api/db/query.js';

// ─── Role helpers ────────────────────────────────────────────────────────

// True for users with system-wide override privileges. Today this maps to
// `user_type = 'admin'` (the dev-bypass + seeded-admin path). Phase 1 will
// split this into `system_role IN ('sysadmin', 'admin')` — for now both
// tiers collapse to "sees everything".
export function isPrivileged(user) {
	return user?.user_type === 'admin';
}

// Hard guard for routes that should only be reachable by sysadmin (today:
// /manager). Throws 403 if the caller isn't privileged. Phase 1 narrows
// this to a strict sysadmin check once role tiers split.
export function assertSysadmin(user) {
	if (!user) throw error(401, 'Not authenticated');
	if (!isPrivileged(user)) throw error(403, 'Sysadmin access required');
}

// ─── Visible-set queries (the "what can this user see" predicate) ────────

// Org IDs (current `tenant_id`s) the user has any access to. Phase 0:
// privileged → every active org; otherwise → just the user's tenant.
// Phase 2 will derive this from org_memberships + sysadmin override.
export async function visibleOrgIds(user) {
	if (!user) return [];
	if (isPrivileged(user)) {
		const rows = await runQuery(
			`SELECT id FROM tenants WHERE status = 'active'`
		);
		return rows.map((r) => r.id);
	}
	return user.tenant_id ? [user.tenant_id] : [];
}

// Property IDs the user can see. Phase 2 will join through ownership +
// org_memberships + property_managers + active vendor_grants.
export async function visiblePropertyIds(user) {
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return [];
	const rows = await runQuery(
		`SELECT id FROM properties WHERE tenant_id = ANY(@orgs::uuid[])`,
		{ orgs }
	);
	return rows.map((r) => r.id);
}

// ─── Per-row visibility checks ───────────────────────────────────────────

export async function canSeeProperty(user, propertyId) {
	if (!user || !propertyId) return false;
	if (isPrivileged(user)) return true;
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return false;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM properties
		   WHERE id = @propertyId
		     AND tenant_id = ANY(@orgs::uuid[])
		   LIMIT 1`,
		{ propertyId, orgs }
	);
	return !!row;
}

export async function assertCanSeeProperty(user, propertyId) {
	if (!(await canSeeProperty(user, propertyId))) {
		throw error(403, 'Not authorized to view this property');
	}
}

export async function canSeeUnit(user, unitId) {
	if (!user || !unitId) return false;
	if (isPrivileged(user)) return true;
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return false;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM property_units
		   WHERE id = @unitId
		     AND tenant_id = ANY(@orgs::uuid[])
		   LIMIT 1`,
		{ unitId, orgs }
	);
	return !!row;
}

export async function assertCanSeeUnit(user, unitId) {
	if (!(await canSeeUnit(user, unitId))) {
		throw error(403, 'Not authorized to view this unit');
	}
}

export async function canSeeAgreement(user, agreementId) {
	if (!user || !agreementId) return false;
	if (isPrivileged(user)) return true;
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return false;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM agreements
		   WHERE id = @agreementId
		     AND tenant_id = ANY(@orgs::uuid[])
		   LIMIT 1`,
		{ agreementId, orgs }
	);
	return !!row;
}

export async function assertCanSeeAgreement(user, agreementId) {
	if (!(await canSeeAgreement(user, agreementId))) {
		throw error(403, 'Not authorized to view this agreement');
	}
}

export async function canSeeInvoice(user, invoiceId) {
	if (!user || !invoiceId) return false;
	if (isPrivileged(user)) return true;
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return false;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM invoices
		   WHERE id = @invoiceId
		     AND tenant_id = ANY(@orgs::uuid[])
		   LIMIT 1`,
		{ invoiceId, orgs }
	);
	return !!row;
}

export async function assertCanSeeInvoice(user, invoiceId) {
	if (!(await canSeeInvoice(user, invoiceId))) {
		throw error(403, 'Not authorized to view this invoice');
	}
}

// ─── Per-row management checks ───────────────────────────────────────────
//
// Phase 0: same as visibility. Phase 2 narrows to org admin/owner +
// property_managers + sysadmin (read access alone won't be enough to
// mutate).

export async function canManageProperty(user, propertyId) {
	return canSeeProperty(user, propertyId);
}

export async function assertCanManageProperty(user, propertyId) {
	if (!(await canManageProperty(user, propertyId))) {
		throw error(403, 'Not authorized to manage this property');
	}
}

export async function canManageUnit(user, unitId) {
	return canSeeUnit(user, unitId);
}

export async function assertCanManageUnit(user, unitId) {
	if (!(await canManageUnit(user, unitId))) {
		throw error(403, 'Not authorized to manage this unit');
	}
}
