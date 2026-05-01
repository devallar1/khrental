// Load .env into process.env BEFORE any other server module is imported.
// Vite's default behaviour only forwards VITE_-prefixed vars to process.env;
// everything else (BETTER_AUTH_SECRET, GOOGLE_CLIENT_*, PG_*, ...) needs this.
import 'dotenv/config';

import { auth } from '$lib/server/auth';
import { runSingleQuery } from './api/db/query.js';

// Dev bypass: hardcoded admin user, gated behind AUTH_DEV_BYPASS=true.
// Default is real auth.
const createDevBypassUser = async () => {
	const tenant = await resolveDefaultTenant();
	return {
		id: 'dev-bypass-admin',
		email: 'dev+admin@localhost',
		name: 'Development Admin',
		role: 'admin',
		user_type: 'admin',
		is_sysadmin: true,
		tenant_id: tenant?.id || null,
		is_dev_bypass: true
	};
};

const resolveDefaultTenant = async () => {
	try {
		const tenant = await runSingleQuery(
			`SELECT * FROM organizations WHERE status = 'active' ORDER BY createdat ASC LIMIT 1`
		);
		return tenant || null;
	} catch {
		return null;
	}
};

const resolveAppUser = async (authUserId, authEmail) => {
	if (!authUserId) return null;

	// 1. Direct match on auth_id — the steady state for any returning user.
	try {
		const row = await runSingleQuery(
			`SELECT *
			   FROM app_users
			  WHERE auth_id = @authId
			    AND active = true
			  ORDER BY createdat ASC
			  LIMIT 1`,
			{ authId: authUserId }
		);
		if (row) return row;
	} catch (error) {
		console.error('[hooks.server] resolveAppUser direct lookup failed:', error);
	}

	// 2. First-sign-in for a pre-seeded user: a row exists with their email
	//    but auth_id is still NULL. Stamp auth_id atomically (only if still
	//    unclaimed) and return. Google-verified emails only — Better-Auth's
	//    google plugin requires email verification before issuing a token,
	//    so this can't be spoofed by a different signed-in account.
	if (!authEmail) return null;
	try {
		const candidate = await runSingleQuery(
			`SELECT *
			   FROM app_users
			  WHERE LOWER(email) = LOWER(@email)
			    AND auth_id IS NULL
			    AND active = true
			  ORDER BY createdat ASC
			  LIMIT 1`,
			{ email: authEmail }
		);
		if (!candidate) return null;

		const linked = await runSingleQuery(
			`UPDATE app_users
			    SET auth_id = @authId,
			        updatedat = NOW()
			  WHERE id = @id
			    AND auth_id IS NULL
			  RETURNING *`,
			{ authId: authUserId, id: candidate.id }
		);
		if (linked) {
			console.log(
				`[auth] Linked auth_user ${authUserId} → app_users ${linked.id} (${authEmail}) via email match`
			);
		}
		return linked || null;
	} catch (error) {
		console.error('[hooks.server] resolveAppUser email-fallback failed:', error);
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
const autoProvisionAppUser = async (sessionUser) => {
	if (!sessionUser) return null;
	const tenant = await resolveDefaultTenant();
	const tenantId = tenant?.id;
	if (!tenantId) return null;

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
		return resolveAppUser(sessionUser.id, sessionUser.email);
	}
};

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	// 1. Better-Auth session (if any). Cookie mutations live inside
	//    /auth/[...all]; we just read here.
	let session = null;
	try {
		session = await auth.api.getSession({ headers: event.request.headers });
	} catch (error) {
		console.error('[hooks.server] auth.api.getSession failed:', error);
	}

	event.locals.session = session;

	// 2. Resolve the app_user from the session. The kh_tenant_id cookie is
	//    gone — access is decided by ownership/membership through authz.js.
	//    Tenant context for the sidebar + legacy INSERT stamps is derived
	//    from the resolved user's primary tenant_id.
	let user = await resolveAppUser(session?.user?.id, session?.user?.email);

	if (!user && session?.user && process.env.AUTH_DEV_AUTOPROVISION === 'true') {
		user = await autoProvisionAppUser(session.user);
	}

	if (!user && process.env.AUTH_DEV_BYPASS === 'true') {
		user = await createDevBypassUser();
	}

	event.locals.user = user;

	// 3. Derive tenant context from the user. Still needed by the 9
	//    INSERT actions that haven't been migrated to owner_user_id yet
	//    and by the sidebar workspace label. Phase 4 retires it.
	if (user?.tenant_id) {
		const tenant = await runSingleQuery(
			`SELECT * FROM organizations WHERE id = @tenantId AND status = 'active' LIMIT 1`,
			{ tenantId: user.tenant_id }
		);
		event.locals.tenantId = tenant?.id || null;
		event.locals.tenant = tenant;
	} else {
		event.locals.tenantId = null;
		event.locals.tenant = null;
	}

	return resolve(event);
};
