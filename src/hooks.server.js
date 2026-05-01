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
		kind: 'staff',
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

// Look up the app-side identity for a Better-Auth session. Tries the
// staff table first, then tenants (renters). Returns the row enriched
// with `kind: 'staff' | 'tenant'` so callers can branch (route guards,
// UI, authz). Vendors aren't in this lookup yet — they'll be added
// when vendor onboarding lands.
const resolveAppUser = async (authUserId, authEmail) => {
	if (!authUserId) return null;

	// 1. Direct auth_id match — staff first, then tenants.
	try {
		const staff = await runSingleQuery(
			`SELECT * FROM app_users
			  WHERE auth_id = @authId AND active = true
			  ORDER BY createdat ASC
			  LIMIT 1`,
			{ authId: authUserId }
		);
		if (staff) return { ...staff, kind: 'staff' };

		const tenant = await runSingleQuery(
			`SELECT * FROM tenants
			  WHERE auth_id = @authId AND active = true
			  ORDER BY createdat ASC
			  LIMIT 1`,
			{ authId: authUserId }
		);
		if (tenant) return { ...tenant, kind: 'tenant' };
	} catch (error) {
		console.error('[hooks.server] resolveAppUser direct lookup failed:', error);
	}

	// 2. First-sign-in fallback: a pre-seeded row exists with this email
	//    but auth_id is still NULL. Stamp atomically. Google-verified
	//    emails only (Better-Auth requires verification before issuing a
	//    token, so this can't be spoofed by another signed-in account).
	//    Try staff side first, then tenant.
	if (!authEmail) return null;

	for (const table of ['app_users', 'tenants']) {
		try {
			const candidate = await runSingleQuery(
				`SELECT * FROM ${table}
				  WHERE LOWER(email) = LOWER(@email)
				    AND auth_id IS NULL
				    AND active = true
				  ORDER BY createdat ASC
				  LIMIT 1`,
				{ email: authEmail }
			);
			if (!candidate) continue;

			const linked = await runSingleQuery(
				`UPDATE ${table}
				    SET auth_id = @authId, updatedat = NOW()
				  WHERE id = @id AND auth_id IS NULL
				  RETURNING *`,
				{ authId: authUserId, id: candidate.id }
			);
			if (linked) {
				const kind = table === 'app_users' ? 'staff' : 'tenant';
				console.log(
					`[auth] Linked auth_user ${authUserId} → ${table} ${linked.id} (${authEmail}) via email match`
				);
				return { ...linked, kind };
			}
		} catch (error) {
			console.error(`[hooks.server] resolveAppUser email-fallback (${table}) failed:`, error);
		}
	}

	return null;
};

// Dev-only: auto-provision an identity row on first sign-in so devs can
// land on the right dashboard without the invite flow. Phone-OTP →
// tenants (renters); anything else → app_users (staff). Gated by
// AUTH_DEV_AUTOPROVISION=true. NEVER enable in production.
const autoProvisionAppUser = async (sessionUser) => {
	if (!sessionUser) return null;
	const tenant = await resolveDefaultTenant();
	const tenantId = tenant?.id;
	if (!tenantId) return null;

	const isPhoneSignIn =
		Boolean(sessionUser.phoneNumber) &&
		(!sessionUser.email || String(sessionUser.email).endsWith('@phone.local'));

	const name = sessionUser.name || sessionUser.email || sessionUser.phoneNumber || 'Auto-provisioned user';
	const contactDetails = JSON.stringify(sessionUser.phoneNumber ? { phone: sessionUser.phoneNumber } : {});

	try {
		if (isPhoneSignIn) {
			const inserted = await runSingleQuery(
				`INSERT INTO tenants
				   (auth_id, email, name, contact_details, org_id, active, status, invited)
				 VALUES
				   (@authId, @email, @name, @contactDetails::jsonb, @tenantId, true, 'active', false)
				 RETURNING *`,
				{
					authId: sessionUser.id,
					email: sessionUser.email || null,
					name,
					contactDetails,
					tenantId
				}
			);
			console.log(`[auth] AUTH_DEV_AUTOPROVISION: created tenants row for ${name} in tenant ${tenantId}`);
			return { ...inserted, kind: 'tenant' };
		}
		const inserted = await runSingleQuery(
			`INSERT INTO app_users
			   (auth_id, email, name, role, user_type, contact_details, tenant_id, active, status, invited)
			 VALUES
			   (@authId, @email, @name, 'admin', 'staff', @contactDetails::jsonb, @tenantId, true, 'active', false)
			 RETURNING *`,
			{
				authId: sessionUser.id,
				email: sessionUser.email || null,
				name,
				contactDetails,
				tenantId
			}
		);
		console.log(`[auth] AUTH_DEV_AUTOPROVISION: created app_users row for ${name} in tenant ${tenantId}`);
		return { ...inserted, kind: 'staff' };
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
