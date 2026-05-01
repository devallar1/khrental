// Centralized authorization for app routes.
//
// Phase 2 implementation: the helper bodies now consult the new
// ownership/membership tables (organizations, org_memberships,
// property_managers, properties.owner_*, app_users.is_sysadmin).
// The route files don't change — the chokepoint earns its keep here.
//
// Access model:
//   sysadmin (is_sysadmin=true)        → sees & manages everything
//   admin   (role='admin' legacy)      → sees & manages everything (Phase 4 cleans this up once system_role lands)
//   staff   member of org              → sees + manages all org-owned properties (unless role='shareholder')
//   staff   property_managers row      → sees + manages just that property
//   staff   personal owner_user_id     → sees + manages own properties
//   rentee                             → sees their own user/agreements/invoices only
//
// Shareholder (org_memberships.role='shareholder') is read-only:
// canSee returns true, canManage returns false.

import { error } from '@sveltejs/kit';
import { runQuery, runSingleQuery } from '$api/db/query.js';

// ─── Role helpers ────────────────────────────────────────────────────────

// True for users with system-wide override privileges. Union of the
// legacy admin paths (`role = 'admin'` on real users, `user_type = 'admin'`
// on the dev-bypass path) plus the Phase-1 `is_sysadmin` flag. Phase 4
// narrows this once `system_role` replaces both `user_type` and `role`.
export function isPrivileged(user) {
	if (!user) return false;
	if (user.is_sysadmin === true) return true;
	if (user.role === 'admin') return true;
	if (user.user_type === 'admin') return true;
	return false;
}

// Hard guard for routes that should only be reachable by privileged
// users (today: /manager). Throws 403 otherwise. Phase 4 narrows this
// to a strict sysadmin check.
export function assertSysadmin(user) {
	if (!user) throw error(401, 'Not authenticated');
	if (!isPrivileged(user)) throw error(403, 'Sysadmin access required');
}

// ─── Visible-set queries ─────────────────────────────────────────────────

// Org IDs the user can see data scoped under. For privileged users:
// every active org. Otherwise: orgs the user has any membership in.
export async function visibleOrgIds(user) {
	if (!user) return [];
	if (isPrivileged(user)) {
		const rows = await runQuery(
			`SELECT id FROM organizations WHERE status = 'active'`
		);
		return rows.map((r) => r.id);
	}
	const rows = await runQuery(
		`SELECT m.org_id AS id
		   FROM org_memberships m
		   JOIN organizations o ON o.id = m.org_id
		  WHERE m.user_id = @userId AND o.status = 'active'`,
		{ userId: user.id }
	);
	return rows.map((r) => r.id);
}

// Property IDs the user can see. Union of:
//   - personally owned (properties.owner_user_id = user.id)
//   - owned by an org the user is a member of (any role, including shareholder)
//   - directly delegated via property_managers
// Privileged users see everything.
export async function visiblePropertyIds(user) {
	if (!user) return [];
	if (isPrivileged(user)) {
		const rows = await runQuery(`SELECT id FROM properties`);
		return rows.map((r) => r.id);
	}
	const rows = await runQuery(
		`SELECT id FROM properties WHERE owner_user_id = @userId
		 UNION
		 SELECT p.id FROM properties p
		   JOIN org_memberships m ON m.org_id = p.owner_org_id
		  WHERE m.user_id = @userId
		 UNION
		 SELECT property_id AS id FROM property_managers WHERE user_id = @userId`,
		{ userId: user.id }
	);
	return rows.map((r) => r.id);
}

// ─── Per-row visibility checks ───────────────────────────────────────────
// Inlined the access-grant predicate rather than calling visiblePropertyIds()
// + indexOf, so the DB does the work in a single round-trip and we don't
// pull a potentially-large id list across the wire.

// Returns whether this user has any access path to a property — owns it,
// is in an org that owns it, or is a direct property_manager. Used by
// every per-row visibility check on entities under properties.
const PROPERTY_ACCESS_PREDICATE = `(
	p.owner_user_id = @userId
	OR EXISTS (SELECT 1 FROM org_memberships m
	            WHERE m.user_id = @userId AND m.org_id = p.owner_org_id)
	OR EXISTS (SELECT 1 FROM property_managers pm
	            WHERE pm.user_id = @userId AND pm.property_id = p.id)
)`;

// As above but excludes shareholders (read-only role) on the org path.
// Used by canManage* — write access requires owner / admin / member.
const PROPERTY_MANAGE_PREDICATE = `(
	p.owner_user_id = @userId
	OR EXISTS (SELECT 1 FROM org_memberships m
	            WHERE m.user_id = @userId
	              AND m.org_id = p.owner_org_id
	              AND m.role IN ('owner','admin','member'))
	OR EXISTS (SELECT 1 FROM property_managers pm
	            WHERE pm.user_id = @userId AND pm.property_id = p.id)
)`;

export async function canSeeProperty(user, propertyId) {
	if (!user || !propertyId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM properties p
		  WHERE p.id = @propertyId AND ${PROPERTY_ACCESS_PREDICATE}
		  LIMIT 1`,
		{ propertyId, userId: user.id }
	);
	return !!row;
}

export async function assertCanSeeProperty(user, propertyId) {
	if (!(await canSeeProperty(user, propertyId))) {
		throw error(403, 'Not authorized to view this property');
	}
}

export async function canManageProperty(user, propertyId) {
	if (!user || !propertyId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM properties p
		  WHERE p.id = @propertyId AND ${PROPERTY_MANAGE_PREDICATE}
		  LIMIT 1`,
		{ propertyId, userId: user.id }
	);
	return !!row;
}

export async function assertCanManageProperty(user, propertyId) {
	if (!(await canManageProperty(user, propertyId))) {
		throw error(403, 'Not authorized to manage this property');
	}
}

export async function canSeeUnit(user, unitId) {
	if (!user || !unitId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM property_units u
		   JOIN properties p ON p.id = u.propertyid
		  WHERE u.id = @unitId AND ${PROPERTY_ACCESS_PREDICATE}
		  LIMIT 1`,
		{ unitId, userId: user.id }
	);
	return !!row;
}

export async function assertCanSeeUnit(user, unitId) {
	if (!(await canSeeUnit(user, unitId))) {
		throw error(403, 'Not authorized to view this unit');
	}
}

export async function canManageUnit(user, unitId) {
	if (!user || !unitId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM property_units u
		   JOIN properties p ON p.id = u.propertyid
		  WHERE u.id = @unitId AND ${PROPERTY_MANAGE_PREDICATE}
		  LIMIT 1`,
		{ unitId, userId: user.id }
	);
	return !!row;
}

export async function assertCanManageUnit(user, unitId) {
	if (!(await canManageUnit(user, unitId))) {
		throw error(403, 'Not authorized to manage this unit');
	}
}

// Agreements: a rentee sees their OWN agreement; staff see agreements
// for properties they have access to.
export async function canSeeAgreement(user, agreementId) {
	if (!user || !agreementId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM agreements a
		   JOIN properties p ON p.id = a.propertyid
		  WHERE a.id = @agreementId
		    AND (a.tenant_id = @userId OR ${PROPERTY_ACCESS_PREDICATE})
		  LIMIT 1`,
		{ agreementId, userId: user.id }
	);
	return !!row;
}

export async function assertCanSeeAgreement(user, agreementId) {
	if (!(await canSeeAgreement(user, agreementId))) {
		throw error(403, 'Not authorized to view this agreement');
	}
}

// Invoices: same shape as agreements. Rentees see their own; staff
// scoped through the property.
export async function canSeeInvoice(user, invoiceId) {
	if (!user || !invoiceId) return false;
	if (isPrivileged(user)) return true;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM invoices i
		   JOIN properties p ON p.id = i.propertyid
		  WHERE i.id = @invoiceId
		    AND (i.tenant_id = @userId OR ${PROPERTY_ACCESS_PREDICATE})
		  LIMIT 1`,
		{ invoiceId, userId: user.id }
	);
	return !!row;
}

export async function assertCanSeeInvoice(user, invoiceId) {
	if (!(await canSeeInvoice(user, invoiceId))) {
		throw error(403, 'Not authorized to view this invoice');
	}
}

// Tenants (renters): a tenant sees themselves; staff see tenants whose
// org_id is in the staff's visible orgs (preserves the "address book"
// scope without forcing tenants through org_memberships).
export async function canSeeTenant(user, tenantId) {
	if (!user || !tenantId) return false;
	if (isPrivileged(user)) return true;
	if (user.id === tenantId) return true;
	const orgs = await visibleOrgIds(user);
	if (orgs.length === 0) return false;
	const row = await runSingleQuery(
		`SELECT 1 AS ok FROM tenants
		   WHERE id = @tenantId
		     AND org_id = ANY(@orgs::uuid[])
		   LIMIT 1`,
		{ tenantId, orgs }
	);
	return !!row;
}

export async function assertCanSeeTenant(user, tenantId) {
	if (!(await canSeeTenant(user, tenantId))) {
		throw error(403, 'Not authorized to view this tenant');
	}
}

export async function canManageTenant(user, tenantId) {
	// Same as canSeeTenant but a tenant shouldn't be able to mutate
	// their own row through a staff endpoint — that goes through the
	// tenant portal with its own checks. Collapse to canSee for now;
	// tighten in a follow-up.
	return canSeeTenant(user, tenantId);
}

export async function assertCanManageTenant(user, tenantId) {
	if (!(await canManageTenant(user, tenantId))) {
		throw error(403, 'Not authorized to manage this tenant');
	}
}
