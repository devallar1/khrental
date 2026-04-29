// Load .env into process.env BEFORE any other server module is imported.
// Vite's default behaviour only forwards VITE_-prefixed vars to process.env;
// everything else (BETTER_AUTH_SECRET, GOOGLE_CLIENT_*, PG_*, ...) needs this.
import 'dotenv/config';

import { auth } from '$lib/server/auth';
import { runSingleQuery, runQuery } from './api/db/query.js';

// Dev bypass: hardcoded admin user, gated behind AUTH_DEV_BYPASS=true.
// Default is real auth.
const createDevBypassUser = (tenantId) => ({
	id: 'dev-bypass-admin',
	email: 'dev+admin@localhost',
	name: 'Development Admin',
	role: 'admin',
	user_type: 'admin',
	tenant_id: tenantId,
	is_dev_bypass: true
});

const resolveDefaultTenant = async () => {
	try {
		const tenant = await runSingleQuery(
			`SELECT * FROM tenants WHERE status = 'active' ORDER BY createdat ASC LIMIT 1`
		);
		return tenant || null;
	} catch {
		return null;
	}
};

const resolveAllTenants = async () => {
	try {
		return await runQuery(
			`SELECT id, name, slug, status, plan FROM tenants WHERE status = 'active' ORDER BY name ASC`
		);
	} catch {
		return [];
	}
};

const resolveAppUser = async (authUserId, tenantId) => {
	if (!authUserId) return null;
	try {
		// Match by auth_id; if a tenant is selected, restrict to that tenant.
		// If no tenant_id is bound on the row yet (first-login race), fall back
		// to any active row for this auth_id.
		if (tenantId) {
			const row = await runSingleQuery(
				`SELECT *
				   FROM app_users
				  WHERE auth_id = @authId
				    AND tenant_id = @tenantId
				    AND active = true
				  LIMIT 1`,
				{ authId: authUserId, tenantId }
			);
			if (row) return row;
		}
		return await runSingleQuery(
			`SELECT *
			   FROM app_users
			  WHERE auth_id = @authId
			    AND active = true
			  ORDER BY createdat ASC
			  LIMIT 1`,
			{ authId: authUserId }
		);
	} catch (error) {
		console.error('[hooks.server] resolveAppUser failed:', error);
		return null;
	}
};

// Dev-only: when a Better-Auth session exists but there's no app_users row
// for this identity, auto-provision a row in the active tenant so you can
// land on the right dashboard without building the full invite flow first.
//
// Phone-OTP sign-ins -> role='rentee' (renter individual flow).
// Anything else -> role='admin' (staff testing).
//
// Gated by AUTH_DEV_AUTOPROVISION=true. NEVER enable in production.
const autoProvisionAppUser = async (sessionUser, tenantId) => {
	if (!sessionUser || !tenantId) return null;

	const isPhoneSignIn =
		Boolean(sessionUser.phoneNumber) &&
		(!sessionUser.email || String(sessionUser.email).endsWith('@phone.local'));
	const role = isPhoneSignIn ? 'rentee' : 'admin';
	const userType = isPhoneSignIn ? 'rentee' : 'staff';

	try {
		const inserted = await runSingleQuery(
			`INSERT INTO app_users
			   (auth_id, email, name, role, user_type, contact_details, tenant_id, active, status, invited)
			 VALUES
			   (@authId, @email, @name, @role, @userType, @contactDetails::jsonb, @tenantId, true, 'active', false)
			 RETURNING *`,
			{
				authId: sessionUser.id,
				email: sessionUser.email || null,
				name: sessionUser.name || sessionUser.email || sessionUser.phoneNumber || 'Auto-provisioned user',
				role,
				userType,
				contactDetails: JSON.stringify(sessionUser.phoneNumber ? { phone: sessionUser.phoneNumber } : {}),
				tenantId
			}
		);
		console.log(
			`[auth] AUTH_DEV_AUTOPROVISION: created app_users for ${sessionUser.email || sessionUser.phoneNumber} as ${role} in tenant ${tenantId}`
		);
		return inserted;
	} catch (error) {
		console.error('[hooks.server] autoProvisionAppUser failed:', error);
		// On unique-constraint conflict (someone raced us), re-query.
		return resolveAppUser(sessionUser.id, tenantId);
	}
};

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	// 1. Read the Better-Auth session (if any). This does NOT mutate cookies;
	//    cookie writes happen inside the /auth/[...all] catch-all route.
	let session = null;
	try {
		session = await auth.api.getSession({ headers: event.request.headers });
	} catch (error) {
		console.error('[hooks.server] auth.api.getSession failed:', error);
	}

	event.locals.session = session;

	// 2. Resolve tenant from cookie or fall back to a default. Same logic
	//    as before — auth doesn't change tenant resolution.
	const cookieTenantId = event.cookies.get('kh_tenant_id');

	let tenant = null;
	if (cookieTenantId) {
		tenant = await runSingleQuery(
			`SELECT * FROM tenants WHERE id = @tenantId AND status = 'active' LIMIT 1`,
			{ tenantId: cookieTenantId }
		);
	}

	if (!tenant) {
		tenant = await resolveDefaultTenant();
	}

	const tenantId = tenant?.id || null;
	const allTenants = await resolveAllTenants();

	if (tenantId && cookieTenantId !== tenantId) {
		event.cookies.set('kh_tenant_id', tenantId, {
			path: '/',
			httpOnly: false, // JS needs to read this for tenant switcher
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	// 3. Look up the app_users row for the authenticated identity.
	let user = await resolveAppUser(session?.user?.id, tenantId);

	// 3b. Dev convenience: auto-provision an app_users admin row on first
	//     sign-in so you can land on /dashboard without an invite flow.
	if (!user && session?.user && process.env.AUTH_DEV_AUTOPROVISION === 'true') {
		user = await autoProvisionAppUser(session.user, tenantId);
	}

	// 4. Optional dev bypass — only when AUTH_DEV_BYPASS=true is explicitly set.
	if (!user && process.env.AUTH_DEV_BYPASS === 'true') {
		user = createDevBypassUser(tenantId);
	}

	event.locals.user = user;
	event.locals.tenantId = tenantId;
	event.locals.tenant = tenant;
	event.locals.tenants = allTenants;

	return resolve(event);
};
