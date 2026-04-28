import { getPool } from './api/db/pool.js';
import { runSingleQuery, runQuery } from './api/db/query.js';

// Dev bypass: hardcoded admin user — real auth will be added later
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

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
	// Read tenant ID from cookie or default
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

	// Set tenant cookie if resolved and not already set
	if (tenantId && cookieTenantId !== tenantId) {
		event.cookies.set('kh_tenant_id', tenantId, {
			path: '/',
			httpOnly: false, // JS needs to read this for tenant switcher
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	event.locals.user = createDevBypassUser(tenantId);
	event.locals.tenantId = tenantId;
	event.locals.tenant = tenant;
	event.locals.tenants = allTenants;

	return resolve(event);
};
